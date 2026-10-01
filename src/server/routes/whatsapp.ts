import { Router, Request, Response } from 'express';
import { requireAuth, isAdministrativeRole } from '../middleware/rbac';
import { getServerSupabase, logAuditEvent } from '../services/supabaseServer';
import { WhatsAppGroupConfig } from '../../types';
import { logger } from '../../lib/logger';

export const whatsappRouter = Router();

// Default-deny at router level
whatsappRouter.use(requireAuth);

const DEFAULT_WHATSAPP_CONFIG: WhatsAppGroupConfig = {
  groupName: 'HTEIM School of Ministry - Class Fellowship & Announcements',
  groupInviteUrl: 'https://chat.whatsapp.com/invite/HTEIMClassGroup2026',
  description: 'Official WhatsApp group for live Tuesday lecture links, ministry announcements, and prayer requests.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default'
};

// In-memory fallback cache
let activeWhatsAppConfig: WhatsAppGroupConfig = { ...DEFAULT_WHATSAPP_CONFIG };

/**
 * GET /api/whatsapp/config
 * Retrieves authoritative WhatsApp group configuration.
 * Accessible to any authenticated student, faculty, or administrator.
 */
whatsappRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, updated_at, updated_by')
        .eq('key', 'whatsapp_group_config')
        .maybeSingle();

      if (!error && data?.value) {
        activeWhatsAppConfig = {
          ...DEFAULT_WHATSAPP_CONFIG,
          ...data.value,
          updatedAt: data.updated_at || activeWhatsAppConfig.updatedAt,
          updatedBy: data.updated_by || activeWhatsAppConfig.updatedBy
        };
      }
    }

    return res.status(200).json({
      success: true,
      config: activeWhatsAppConfig
    });
  } catch (err: any) {
    logger.warn('Error fetching WhatsApp config from database, using cached fallback:', err?.message || err);
    return res.status(200).json({
      success: true,
      config: activeWhatsAppConfig
    });
  }
});

/**
 * PUT /api/whatsapp/config
 * Updates authoritative WhatsApp group configuration.
 * Strictly restricted to administrative personnel (admin / super_admin).
 */
whatsappRouter.put('/config', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !isAdministrativeRole(user.role)) {
      logger.warn(`Unauthorized WhatsApp config update attempted by ${user?.email || 'unknown'} with role ${user?.role}`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only administrators may modify the official WhatsApp group configuration.'
      });
    }

    const { groupName, groupInviteUrl, description } = req.body;

    if (!groupName || typeof groupName !== 'string' || !groupName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: groupName is required.'
      });
    }

    if (!groupInviteUrl || typeof groupInviteUrl !== 'string' || !groupInviteUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: groupInviteUrl is required.'
      });
    }

    // Sanitize invite URL format
    const trimmedUrl = groupInviteUrl.trim();
    if (!trimmedUrl.startsWith('https://chat.whatsapp.com/') && !trimmedUrl.startsWith('https://wa.me/')) {
      return res.status(400).json({
        success: false,
        error: 'Security Error: Invite URL must start with https://chat.whatsapp.com/ or https://wa.me/'
      });
    }

    const previousConfig = { ...activeWhatsAppConfig };
    const now = new Date().toISOString();

    const updatedConfig: WhatsAppGroupConfig = {
      groupName: groupName.trim(),
      groupInviteUrl: trimmedUrl,
      description: typeof description === 'string' ? description.trim() : activeWhatsAppConfig.description,
      updatedAt: now,
      updatedBy: user.email || user.name || 'Administrator'
    };

    activeWhatsAppConfig = updatedConfig;

    // Persist to Supabase system_settings if connected
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        await supabase.from('system_settings').upsert({
          key: 'whatsapp_group_config',
          value: updatedConfig,
          updated_at: now,
          updated_by: user.email
        }, { onConflict: 'key' });
      } catch (dbErr: any) {
        logger.warn('Failed to upsert to system_settings, maintained in memory:', dbErr?.message || dbErr);
      }
    }

    // Authoritative Audit Logging
    try {
      await logAuditEvent({
        actorUserId: user.userId,
        actorRole: user.role,
        entityType: 'system_settings',
        entityId: 'whatsapp_group_config',
        action: 'update_whatsapp_config',
        oldValues: previousConfig,
        newValues: updatedConfig,
        changedFields: ['groupName', 'groupInviteUrl', 'description'],
        reason: 'Administrative update to official school WhatsApp community configuration',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (auditErr) {
      logger.warn('Warning logging WhatsApp config audit event:', auditErr);
    }

    logger.info(`WhatsApp configuration updated by ${user.email}: "${updatedConfig.groupName}"`);

    return res.status(200).json({
      success: true,
      config: updatedConfig,
      message: 'WhatsApp configuration successfully updated and broadcasted.'
    });
  } catch (err: any) {
    logger.error('PUT /api/whatsapp/config error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update WhatsApp configuration'
    });
  }
});

/**
 * POST /api/whatsapp/broadcast-preview
 * Generates sanitized text and direct launch link for WhatsApp broadcast.
 */
whatsappRouter.post('/broadcast-preview', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { subject = 'School of Ministry Update', message = '', target = 'all_students' } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Broadcast message body is required.' });
    }

    const lines = [
      `*📢 HTEIM SCHOOL OF MINISTRY ANNOUNCEMENT*`,
      `*Subject:* ${subject.trim()}`,
      `*Target:* ${target === 'all_students' ? 'All Enrolled Students' : target}`,
      `*Date:* ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
      ``,
      `${message.trim()}`,
      ``,
      `────────────────────────`,
      `🏛️ *HTEIM Student Portal:* ${req.protocol}://${req.get('host') || 'hteim.edu'}`,
      `💬 *Broadcasted by:* ${user.name || user.email} (${user.role.toUpperCase()})`
    ];

    const formattedText = lines.join('\n');
    const whatsappWebUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedText)}`;

    // If teacher/admin broadcasts, log audit event
    if (isAdministrativeRole(user.role) || user.role === 'teacher' || user.role === 'lecturer') {
      try {
        await logAuditEvent({
          actorUserId: user.userId,
          actorRole: user.role,
          entityType: 'broadcast',
          entityId: `broadcast_${Date.now()}`,
          action: 'prepare_whatsapp_broadcast',
          newValues: { subject, target, charCount: message.length },
          reason: 'Faculty broadcast prepared for WhatsApp'
        });
      } catch (auditErr) {
        // Non-blocking
      }
    }

    return res.status(200).json({
      success: true,
      formattedText,
      whatsappWebUrl
    });
  } catch (err: any) {
    logger.error('POST /api/whatsapp/broadcast-preview error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate broadcast preview' });
  }
});
