#!/usr/bin/env python3
import math
import subprocess
import os
import sys
import base64
import wave
import struct
import time
import concurrent.futures

# Video configuration: 1280x720 @ 30fps for 6.0 seconds = 180 frames
WIDTH = 1280
HEIGHT = 720
FPS = 30
DURATION_SEC = 6.0
TOTAL_FRAMES = int(FPS * DURATION_SEC)

def generate_audio_wav(output_wav_path):
    sample_rate = 44100
    num_samples = int(sample_rate * DURATION_SEC)
    
    # Celestial chord (D major 9: D3, A3, D4, F#4, A4, C#5, E5)
    freqs = [146.83, 220.00, 293.66, 369.99, 440.00, 554.37, 659.25]
    
    frames = bytearray()
    for i in range(num_samples):
        t = i / float(sample_rate)
        
        # Base envelope: gentle swell up to 1.5s, hold till 5.0s, smooth fade out by 6.0s
        if t < 1.5:
            env = (t / 1.5) ** 1.5
        elif t < 5.0:
            env = 1.0
        else:
            env = max(0.0, 1.0 - ((t - 5.0) / 1.0) ** 1.5)
            
        sample_val = 0.0
        # Warm pad chords
        for idx, freq in enumerate(freqs):
            detune = math.sin(t * 0.8 + idx) * 1.5
            amp = 0.12 / (idx * 0.2 + 1.0)
            sample_val += math.sin(2.0 * math.pi * (freq + detune) * t) * amp
            # Soft overtone
            sample_val += math.sin(4.0 * math.pi * (freq + detune) * t) * (amp * 0.25)
            
        # Shimmer bell chime starting at t = 3.2s
        if t >= 3.2:
            chime_t = t - 3.2
            chime_env = math.exp(-chime_t * 2.2) * 0.18
            sample_val += math.sin(2.0 * math.pi * 1174.66 * chime_t) * chime_env # D6
            sample_val += math.sin(2.0 * math.pi * 1760.00 * chime_t) * (chime_env * 0.4) # A6
            sample_val += math.sin(2.0 * math.pi * 2349.32 * chime_t) * (chime_env * 0.2) # D7
            
        # Total amplitude scaling
        final_sample = max(-0.95, min(0.95, sample_val * env))
        int_sample = int(final_sample * 32767.0)
        
        # Stereo 16-bit PCM
        frames.extend(struct.pack('<hh', int_sample, int_sample))
        
    with wave.open(output_wav_path, 'wb') as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(frames)

# Pre-generate 50 golden bokeh particles
particles = []
import random
random.seed(42)
for i in range(50):
    particles.append({
        'x': random.uniform(0.05, 0.95),
        'y': random.uniform(0.05, 0.95),
        'radius': random.uniform(8, 30),
        'speed_y': random.uniform(-0.035, -0.012),
        'drift_x': random.uniform(-0.015, 0.015),
        'phase': random.uniform(0, math.pi * 2),
        'alpha': random.uniform(0.3, 0.7),
        'color': random.choice([
            (255, 215, 120),
            (245, 190, 80),
            (255, 235, 160),
            (230, 170, 60),
            (255, 240, 200)
        ])
    })

def generate_frame_svg(frame_idx, logo_b64):
    t = frame_idx / float(FPS) # time in seconds (0.0 to 6.0)

    if t < 3.5:
        bg_center = (18, 38, 72)
        bg_edge = (6, 12, 22)
        transition_to_light = 0.0
    elif t < 4.8:
        progress = (t - 3.5) / 1.3
        eased = 0.5 - 0.5 * math.cos(progress * math.pi)
        transition_to_light = eased
        bg_center = (
            int(18 + (255 - 18) * eased),
            int(38 + (255 - 38) * eased),
            int(72 + (255 - 72) * eased)
        )
        bg_edge = (
            int(6 + (228 - 6) * eased),
            int(12 + (232 - 12) * eased),
            int(22 + (238 - 22) * eased)
        )
    else:
        transition_to_light = 1.0
        bg_center = (255, 255, 255)
        bg_edge = (226, 230, 236)

    svg_parts = [
        f'<svg width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
    ]

    svg_parts.append(f'''
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="rgb({bg_center[0]},{bg_center[1]},{bg_center[2]})" />
        <stop offset="100%" stop-color="rgb({bg_edge[0]},{bg_edge[1]},{bg_edge[2]})" />
      </radialGradient>
      
      <filter id="bokehBlur">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      
      <filter id="softGlow">
        <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="rgba(0,0,0,0.18)"/>
      </filter>
    </defs>
    ''')

    svg_parts.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#bgGrad)" />')

    if t > 0.8 and t < 4.5:
        if t < 1.6:
            ray_alpha = (t - 0.8) / 0.8
        elif t > 3.8:
            ray_alpha = max(0.0, 1.0 - (t - 3.8) / 0.7)
        else:
            ray_alpha = 1.0
        
        rot = (t - 0.8) * 12.0
        cx = WIDTH / 2
        cy = HEIGHT / 2 - 30 if t > 3.5 else HEIGHT / 2

        svg_parts.append(f'<g opacity="{ray_alpha * 0.38:.2f}" transform="rotate({rot:.1f} {cx} {cy})">')
        num_rays = 16
        for r in range(num_rays):
            angle = (r / float(num_rays)) * math.pi * 2
            r_len = 520
            x2 = cx + math.cos(angle) * r_len
            y2 = cy + math.sin(angle) * r_len
            x3 = cx + math.cos(angle + 0.12) * r_len
            y3 = cy + math.sin(angle + 0.12) * r_len
            svg_parts.append(f'<polygon points="{cx:.1f},{cy:.1f} {x2:.1f},{y2:.1f} {x3:.1f},{y3:.1f}" fill="rgba(245,190,80,0.3)" />')
        svg_parts.append('</g>')

    bokeh_opacity = 0.8 * (1.0 - transition_to_light * 0.6)
    if bokeh_opacity > 0.05:
        svg_parts.append(f'<g opacity="{bokeh_opacity:.2f}">')
        for p in particles:
            cur_y = (p['y'] + p['speed_y'] * t) % 1.0
            cur_x = (p['x'] + math.sin(t * 1.4 + p['phase']) * p['drift_x']) % 1.0
            px = cur_x * WIDTH
            py = cur_y * HEIGHT
            pulse = 0.8 + 0.25 * math.sin(t * 3.0 + p['phase'])
            rad = p['radius'] * pulse
            c = p['color']
            svg_parts.append(
                f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{rad:.1f}" fill="rgb({c[0]},{c[1]},{c[2]})" opacity="{p["alpha"]:.2f}" filter="url(#bokehBlur)" />'
            )
        svg_parts.append('</g>')

    if t >= 0.9 and t < 4.0:
        globe_progress = min(1.0, (t - 0.9) / 1.0)
        if globe_progress < 1.0:
            scale = 0.2 + 0.8 * (1.0 - math.pow(1.0 - globe_progress, 3))
            globe_opacity = min(1.0, globe_progress * 1.5)
        else:
            scale = 1.0
            globe_opacity = 1.0
            if t > 3.4:
                globe_opacity = max(0.0, 1.0 - (t - 3.4) / 0.6)

        globe_radius = 120 * scale
        gcx = WIDTH / 2
        gcy = HEIGHT / 2

        spin_offset = ((t - 0.9) * 55) % 240

        svg_parts.append(f'''
        <g opacity="{globe_opacity:.2f}">
          <circle cx="{gcx}" cy="{gcy}" r="{globe_radius + 10}" fill="none" stroke="rgba(120,200,255,0.4)" stroke-width="6" filter="url(#bokehBlur)" />
          <circle cx="{gcx}" cy="{gcy}" r="{globe_radius + 3}" fill="none" stroke="rgba(245,190,80,0.7)" stroke-width="3" />
          
          <clipPath id="globeClip_{frame_idx}">
            <circle cx="{gcx}" cy="{gcy}" r="{globe_radius}" />
          </clipPath>
          
          <g clip-path="url(#globeClip_{frame_idx})">
            <circle cx="{gcx}" cy="{gcy}" r="{globe_radius}" fill="#113a6b" />
            
            <g transform="translate({-spin_offset * scale:.1f}, 0)">
              <g fill="#2e944b" opacity="0.95" transform="translate({gcx - 120 * scale:.1f}, {gcy - 120 * scale:.1f}) scale({scale * 1.2:.2f})">
                <path d="M 20,40 Q 40,25 60,35 T 85,30 T 95,55 T 65,80 T 25,60 Z" />
                <path d="M 65,90 Q 90,105 75,145 T 55,180 T 45,150 T 48,110 Z" />
                <path d="M 125,75 Q 155,65 175,105 T 160,165 T 125,135 T 120,100 Z" />
                <path d="M 115,25 Q 140,15 155,40 T 130,65 T 110,45 Z" />
                <path d="M 160,30 Q 195,20 220,50 T 210,95 T 170,70 Z" />
              </g>
              <g fill="#2e944b" opacity="0.95" transform="translate({gcx + 120 * scale:.1f}, {gcy - 120 * scale:.1f}) scale({scale * 1.2:.2f})">
                <path d="M 20,40 Q 40,25 60,35 T 85,30 T 95,55 T 65,80 T 25,60 Z" />
                <path d="M 65,90 Q 90,105 75,145 T 55,180 T 45,150 T 48,110 Z" />
                <path d="M 125,75 Q 155,65 175,105 T 160,165 T 125,135 T 120,100 Z" />
                <path d="M 115,25 Q 140,15 155,40 T 130,65 T 110,45 Z" />
                <path d="M 160,30 Q 195,20 220,50 T 210,95 T 170,70 Z" />
              </g>
            </g>
            
            <radialGradient id="globeShading_{frame_idx}" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.4)" />
              <stop offset="45%" stop-color="rgba(255,255,255,0.0)" />
              <stop offset="80%" stop-color="rgba(0,0,0,0.5)" />
              <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
            </radialGradient>
            <circle cx="{gcx}" cy="{gcy}" r="{globe_radius}" fill="url(#globeShading_{frame_idx})" />
          </g>
        </g>
        ''')

    if t >= 3.2:
        logo_progress = min(1.0, (t - 3.2) / 0.8)
        logo_opacity = logo_progress
        logo_scale = 0.85 + 0.15 * (1.0 - math.pow(1.0 - logo_progress, 2))
        
        if t >= 4.4:
            shift_progress = min(1.0, (t - 4.4) / 0.6)
            y_shift = -35 * shift_progress
        else:
            y_shift = 0

        lcx = WIDTH / 2
        lcy = (HEIGHT / 2) + y_shift
        logo_w = 320 * logo_scale
        logo_h = 320 * logo_scale
        lx = lcx - logo_w / 2
        ly = lcy - logo_h / 2

        svg_parts.append(f'''
        <g opacity="{logo_opacity:.2f}">
          <g filter="url(#logoShadow)">
            <image href="data:image/png;base64,{logo_b64}" x="{lx:.1f}" y="{ly:.1f}" width="{logo_w:.1f}" height="{logo_h:.1f}" />
          </g>
        </g>
        ''')

    if t >= 4.5:
        motto_progress = min(1.0, (t - 4.5) / 0.7)
        motto_opacity = motto_progress
        motto_y_offset = (1.0 - motto_progress) * 12

        svg_parts.append(f'''
        <g opacity="{motto_opacity:.2f}" transform="translate(0, {motto_y_offset:.1f})">
          <text x="{WIDTH/2}" y="{HEIGHT/2 + 180}" 
                text-anchor="middle" 
                font-family="sans-serif" 
                font-weight="900" 
                font-size="19" 
                letter-spacing="5" 
                fill="#2c3038">
            BRINGING HEAVEN TO EARTH,
          </text>
          
          <text x="{WIDTH/2}" y="{HEIGHT/2 + 210}" 
                text-anchor="middle" 
                font-family="sans-serif" 
                font-weight="900" 
                font-size="19" 
                letter-spacing="5" 
                fill="#2c3038">
            TAKING PEOPLE TO HEAVEN
          </text>
          
          <circle cx="{WIDTH/2 - 165}" cy="{HEIGHT/2 + 195}" r="2.5" fill="#d97706" />
          <circle cx="{WIDTH/2 + 165}" cy="{HEIGHT/2 + 195}" r="2.5" fill="#d97706" />
        </g>
        ''')

    star_rot = (t * 20) % 360
    star_scale = 0.8 + 0.25 * math.sin(t * 2.5)
    star_opacity = 0.35 if t < 3.5 else 0.55
    star_color = "#94a3b8" if t >= 4.5 else "#fde68a"
    
    svg_parts.append(f'''
    <g transform="translate({WIDTH - 70}, {HEIGHT - 55}) rotate({star_rot:.1f}) scale({star_scale:.2f})" opacity="{star_opacity:.2f}">
      <path d="M 0,-15 Q 1,-1 15,0 Q 1,1 0,15 Q -1,1 -15,0 Q -1,-1 0,-15 Z" fill="{star_color}" />
    </g>
    ''')

    svg_parts.append('</svg>')
    return "".join(svg_parts)

def convert_frame_svg_to_png(f):
    svg_p = f"/tmp/intro_frames/frame_{f:04d}.svg"
    png_p = f"/tmp/intro_frames/frame_{f:04d}.png"
    subprocess.run(['ffmpeg', '-y', '-i', svg_p, png_p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def main():
    print("Step 1: Preparing directories and logo...")
    os.makedirs("/tmp/intro_frames", exist_ok=True)
    os.makedirs("public", exist_ok=True)

    logo_png_path = "/tmp/intro_logo_rendered.png"
    subprocess.run(["ffmpeg", "-y", "-i", "public/hteim_logo.svg", "-vf", "scale=800:800", logo_png_path], check=True)
    with open(logo_png_path, "rb") as lf:
        logo_b64 = base64.b64encode(lf.read()).decode("ascii")

    print("Step 2: Synthesizing audio track...")
    audio_wav_path = "/tmp/intro_audio.wav"
    generate_audio_wav(audio_wav_path)

    print("Step 3: Generating SVG frames...")
    for f in range(TOTAL_FRAMES):
        svg_content = generate_frame_svg(f, logo_b64)
        svg_path = f"/tmp/intro_frames/frame_{f:04d}.svg"
        with open(svg_path, "w") as svg_file:
            svg_file.write(svg_content)

    print("Step 4: Parallel rasterizing SVGs to PNGs...")
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(convert_frame_svg_to_png, range(TOTAL_FRAMES)))
    print(f"Rasterized 180 frames in {time.time()-t0:.2f}s")

    print("Step 5: Encoding public/intro.mp4...")
    subprocess.run([
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", "/tmp/intro_frames/frame_%04d.png",
        "-i", audio_wav_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        "public/intro.mp4"
    ], check=True)
    print("public/intro.mp4 created successfully!")

    print("Step 6: Encoding public/intro.webm...")
    subprocess.run([
        "ffmpeg", "-y",
        "-i", "public/intro.mp4",
        "-c:v", "libvpx-vp9",
        "-crf", "28",
        "-b:v", "0",
        "-c:a", "libopus",
        "-b:a", "128k",
        "public/intro.webm"
    ], check=True)
    print("public/intro.webm created successfully!")

if __name__ == "__main__":
    main()
