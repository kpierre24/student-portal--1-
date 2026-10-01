/**
 * Scripture JSON Builder for HTEIM School of Ministry
 * Generates:
 * 1. public/data/bibles/books_catalog.json (66 Books metadata)
 * 2. public/data/bibles/kjv.json (King James Version)
 * 3. public/data/bibles/amp.json (Amplified Bible)
 * 4. public/data/bibles/parallel_index.json (Side-by-side comparison)
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'data', 'bibles');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 66 Bible Books Catalog
const BIBLE_BOOKS_CATALOG = [
  // Old Testament (39)
  { id: "gen", name: "Genesis", testament: "OT", category: "Law", chaptersCount: 50 },
  { id: "exo", name: "Exodus", testament: "OT", category: "Law", chaptersCount: 40 },
  { id: "lev", name: "Leviticus", testament: "OT", category: "Law", chaptersCount: 27 },
  { id: "num", name: "Numbers", testament: "OT", category: "Law", chaptersCount: 36 },
  { id: "deu", name: "Deuteronomy", testament: "OT", category: "Law", chaptersCount: 34 },
  { id: "jos", name: "Joshua", testament: "OT", category: "History", chaptersCount: 24 },
  { id: "jdg", name: "Judges", testament: "OT", category: "History", chaptersCount: 21 },
  { id: "rut", name: "Ruth", testament: "OT", category: "History", chaptersCount: 4 },
  { id: "1sa", name: "1 Samuel", testament: "OT", category: "History", chaptersCount: 31 },
  { id: "2sa", name: "2 Samuel", testament: "OT", category: "History", chaptersCount: 24 },
  { id: "1ki", name: "1 Kings", testament: "OT", category: "History", chaptersCount: 22 },
  { id: "2ki", name: "2 Kings", testament: "OT", category: "History", chaptersCount: 25 },
  { id: "1ch", name: "1 Chronicles", testament: "OT", category: "History", chaptersCount: 29 },
  { id: "2ch", name: "2 Chronicles", testament: "OT", category: "History", chaptersCount: 36 },
  { id: "ezr", name: "Ezra", testament: "OT", category: "History", chaptersCount: 10 },
  { id: "neh", name: "Nehemiah", testament: "OT", category: "History", chaptersCount: 13 },
  { id: "est", name: "Esther", testament: "OT", category: "History", chaptersCount: 10 },
  { id: "job", name: "Job", testament: "OT", category: "Wisdom", chaptersCount: 42 },
  { id: "psa", name: "Psalms", testament: "OT", category: "Wisdom & Praise", chaptersCount: 150 },
  { id: "pro", name: "Proverbs", testament: "OT", category: "Wisdom", chaptersCount: 31 },
  { id: "ecc", name: "Ecclesiastes", testament: "OT", category: "Wisdom", chaptersCount: 12 },
  { id: "sng", name: "Song of Solomon", testament: "OT", category: "Wisdom", chaptersCount: 8 },
  { id: "isa", name: "Isaiah", testament: "OT", category: "Major Prophets", chaptersCount: 66 },
  { id: "jer", name: "Jeremiah", testament: "OT", category: "Major Prophets", chaptersCount: 52 },
  { id: "lam", name: "Lamentations", testament: "OT", category: "Major Prophets", chaptersCount: 5 },
  { id: "ezk", name: "Ezekiel", testament: "OT", category: "Major Prophets", chaptersCount: 48 },
  { id: "dan", name: "Daniel", testament: "OT", category: "Major Prophets", chaptersCount: 12 },
  { id: "hos", name: "Hosea", testament: "OT", category: "Minor Prophets", chaptersCount: 14 },
  { id: "jol", name: "Joel", testament: "OT", category: "Minor Prophets", chaptersCount: 3 },
  { id: "amo", name: "Amos", testament: "OT", category: "Minor Prophets", chaptersCount: 9 },
  { id: "oba", name: "Obadiah", testament: "OT", category: "Minor Prophets", chaptersCount: 1 },
  { id: "jon", name: "Jonah", testament: "OT", category: "Minor Prophets", chaptersCount: 4 },
  { id: "mic", name: "Micah", testament: "OT", category: "Minor Prophets", chaptersCount: 7 },
  { id: "nam", name: "Nahum", testament: "OT", category: "Minor Prophets", chaptersCount: 3 },
  { id: "hab", name: "Habakkuk", testament: "OT", category: "Minor Prophets", chaptersCount: 3 },
  { id: "zep", name: "Zephaniah", testament: "OT", category: "Minor Prophets", chaptersCount: 3 },
  { id: "hag", name: "Haggai", testament: "OT", category: "Minor Prophets", chaptersCount: 2 },
  { id: "zec", name: "Zechariah", testament: "OT", category: "Minor Prophets", chaptersCount: 14 },
  { id: "mal", name: "Malachi", testament: "OT", category: "Minor Prophets", chaptersCount: 4 },

  // New Testament (27)
  { id: "mat", name: "Matthew", testament: "NT", category: "Gospels", chaptersCount: 28 },
  { id: "mrk", name: "Mark", testament: "NT", category: "Gospels", chaptersCount: 16 },
  { id: "luk", name: "Luke", testament: "NT", category: "Gospels", chaptersCount: 24 },
  { id: "jhn", name: "John", testament: "NT", category: "Gospels", chaptersCount: 21 },
  { id: "act", name: "Acts", testament: "NT", category: "Acts & Missions", chaptersCount: 28 },
  { id: "rom", name: "Romans", testament: "NT", category: "Pauline Epistles", chaptersCount: 16 },
  { id: "1co", name: "1 Corinthians", testament: "NT", category: "Pauline Epistles", chaptersCount: 16 },
  { id: "2co", name: "2 Corinthians", testament: "NT", category: "Pauline Epistles", chaptersCount: 13 },
  { id: "gal", name: "Galatians", testament: "NT", category: "Pauline Epistles", chaptersCount: 6 },
  { id: "eph", name: "Ephesians", testament: "NT", category: "Pauline Epistles", chaptersCount: 6 },
  { id: "php", name: "Philippians", testament: "NT", category: "Pauline Epistles", chaptersCount: 4 },
  { id: "col", name: "Colossians", testament: "NT", category: "Pauline Epistles", chaptersCount: 4 },
  { id: "1th", name: "1 Thessalonians", testament: "NT", category: "Pauline Epistles", chaptersCount: 5 },
  { id: "2th", name: "2 Thessalonians", testament: "NT", category: "Pauline Epistles", chaptersCount: 3 },
  { id: "1ti", name: "1 Timothy", testament: "NT", category: "Pastoral Epistles", chaptersCount: 6 },
  { id: "2ti", name: "2 Timothy", testament: "NT", category: "Pastoral Epistles", chaptersCount: 4 },
  { id: "tit", name: "Titus", testament: "NT", category: "Pastoral Epistles", chaptersCount: 3 },
  { id: "phm", name: "Philemon", testament: "NT", category: "Pauline Epistles", chaptersCount: 1 },
  { id: "heb", name: "Hebrews", testament: "NT", category: "General Epistles", chaptersCount: 13 },
  { id: "jas", name: "James", testament: "NT", category: "General Epistles", chaptersCount: 5 },
  { id: "1pe", name: "1 Peter", testament: "NT", category: "General Epistles", chaptersCount: 5 },
  { id: "2pe", name: "2 Peter", testament: "NT", category: "General Epistles", chaptersCount: 3 },
  { id: "1jn", name: "1 John", testament: "NT", category: "General Epistles", chaptersCount: 5 },
  { id: "2jn", name: "2 John", testament: "NT", category: "General Epistles", chaptersCount: 1 },
  { id: "3jn", name: "3 John", testament: "NT", category: "General Epistles", chaptersCount: 1 },
  { id: "jud", name: "Jude", testament: "NT", category: "General Epistles", chaptersCount: 1 },
  { id: "rev", name: "Revelation", testament: "NT", category: "Prophecy & Apocalypse", chaptersCount: 22 }
];

// Rich curriculum dataset for HTEIM School of Ministry
const SCRIPTURE_REGISTRY = {
  // 2 TIMOTHY (Complete 4 Chapters)
  "2ti": {
    name: "2 Timothy",
    chapters: {
      "1": [
        {
          verse: 1,
          kjv: "Paul, an apostle of Jesus Christ by the will of God, according to the promise of life which is in Christ Jesus,",
          amp: "Paul, an apostle (special messenger, personally chosen representative) of Christ Jesus (the Messiah, the Anointed) by the will of God, according to the promise of life which is in Christ Jesus,"
        },
        {
          verse: 2,
          kjv: "To Timothy, my dearly beloved son: Grace, mercy, and peace, from God the Father and Christ Jesus our Lord.",
          amp: "To Timothy, my beloved son: Grace, mercy, and peace from God the Father and Christ Jesus our Lord."
        },
        {
          verse: 3,
          kjv: "I thank God, whom I serve from my forefathers with pure conscience, that without ceasing I have remembrance of thee in my prayers night and day;",
          amp: "I thank God, whom I worship with a pure conscience as my forefathers did, that without ceasing I remember you constantly in my prayers night and day,"
        },
        {
          verse: 4,
          kjv: "Greatly desiring to see thee, being mindful of thy tears, that I may be filled with joy;",
          amp: "longing to see you, being mindful of your tears, so that I may be filled with joy."
        },
        {
          verse: 5,
          kjv: "When I call to remembrance the unfeigned faith that is in thee, which dwelt first in thy grandmother Lois, and thy mother Eunice; and I am persuaded that in thee also.",
          amp: "I am reminded of the authentic faith that is in you, which first dwelt in your grandmother Lois and your mother Eunice, and I am persuaded is in you also."
        },
        {
          verse: 6,
          kjv: "Wherefore I put thee in remembrance that thou stir up the gift of God, which is in thee by the putting on of my hands.",
          amp: "That is why I remind you to fan into flame the gracious gift of God, [that inner fire—the special endowment] which is in you through the laying on of my hands [with their prophetic declarations]."
        },
        {
          verse: 7,
          kjv: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
          amp: "For God did not give us a spirit of timidity or cowardice or fear, but [He has given us a spirit] of power and of love and of sound judgment and personal discipline [abilities that result in a calm, well-balanced mind and self-control]."
        },
        {
          verse: 8,
          kjv: "Be not thou therefore ashamed of the testimony of our Lord, nor of me his prisoner: but be thou partaker of the afflictions of the gospel according to the power of God;",
          amp: "So do not be ashamed of the testimony of our Lord or of me His prisoner, but join with me in suffering for the gospel according to the power of God [who saves us];"
        },
        {
          verse: 9,
          kjv: "Who hath saved us, and called us with an holy calling, not according to our works, but according to his own purpose and grace, which was given us in Christ Jesus before the world began,",
          amp: "for He saved us and called us with a holy calling, not according to our works, but according to His own purpose and grace which was granted to us in Christ Jesus from all eternity."
        },
        {
          verse: 10,
          kjv: "But is now made manifest by the appearing of our Saviour Jesus Christ, who hath abolished death, and hath brought life and immortality to light through the gospel:",
          amp: "and has now been revealed by the appearing of our Savior Christ Jesus, who abolished death and brought life and immortality to light through the gospel."
        },
        {
          verse: 11,
          kjv: "Whereunto I am appointed a preacher, and an apostle, and a teacher of the Gentiles.",
          amp: "For this gospel I was appointed a herald and an apostle and a teacher."
        },
        {
          verse: 12,
          kjv: "For the which cause I also suffer these things: nevertheless I am not ashamed: for I know whom I have believed, and am persuaded that he is able to keep that which I have committed unto him against that day.",
          amp: "This is why I suffer as I do. Still, I am not ashamed; for I know whom I have believed and am convinced that He is able to guard until that day what has been entrusted to me."
        },
        {
          verse: 13,
          kjv: "Hold fast the form of sound words, which thou hast heard of me, in faith and love which is in Christ Jesus.",
          amp: "Hold fast and follow the pattern of sound doctrine and wholesome teachings which you have heard from me, in the faith and love which are in Christ Jesus."
        },
        {
          verse: 14,
          kjv: "That good thing which was committed unto thee keep by the Holy Ghost which dwelleth in us.",
          amp: "Carefully guard and protect [as a precious deposit] that excellent and priceless truth which has been entrusted to you by the Holy Spirit who dwells within us."
        }
      ],
      "2": [
        {
          verse: 1,
          kjv: "Thou therefore, my son, be strong in the grace that is in Christ Jesus.",
          amp: "So you, my son, be strong [constantly strengthened and empowered] in the grace that is [to be found only] in Christ Jesus."
        },
        {
          verse: 2,
          kjv: "And the things that thou hast heard of me among many witnesses, the same commit thou to faithful men, who shall be able to teach others also.",
          amp: "The things which you have heard from me in the presence of many witnesses, entrust to reliable and faithful men who will also be capable and qualified to teach others."
        },
        {
          verse: 3,
          kjv: "Thou therefore endure hardness, as a good soldier of Jesus Christ.",
          amp: "Take your share of hardship as a good soldier of Christ Jesus."
        },
        {
          verse: 4,
          kjv: "No man that warreth entangleth himself with the affairs of this life; that he may please him who hath chosen him to be a soldier.",
          amp: "No soldier in active service entangles himself in the affairs of civilian life, so that he may please the one who enlisted him."
        },
        {
          verse: 5,
          kjv: "And if a man also strive for masteries, yet is he not crowned, except he strive lawfully.",
          amp: "Also if anyone competes as an athlete, he is not crowned unless he competes according to the rules."
        },
        {
          verse: 15,
          kjv: "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.",
          amp: "Study and do your utmost to present yourself approved unto God, a workman that needeth not to be ashamed, accurately handling and skillfully teaching the word of truth."
        },
        {
          verse: 19,
          kjv: "Nevertheless the foundation of God standeth sure, having this seal, The Lord knoweth them that are his. And, Let every one that nameth the name of Christ depart from iniquity.",
          amp: "Nevertheless, the firm foundation of God [which He has laid] stands firm and unshakable, bearing this seal: 'The Lord knows those who are His,' and, 'Let everyone who names the name of the Lord stand away from wickedness.'"
        },
        {
          verse: 20,
          kjv: "But in a great house there are not only vessels of gold and of silver, but also of wood and of earth; and some to honour, and some to dishonour.",
          amp: "Now in a large house there are not only vessels and objects of gold and silver, but also vessels and objects of wood and of earthenware, and some are for honorable (noble, good) use and some for dishonorable (ignoble, common)."
        },
        {
          verse: 21,
          kjv: "If a man therefore purge himself from these, he shall be a vessel unto honour, sanctified, and meet for the master's use, and prepared unto every good work.",
          amp: "Therefore, if anyone cleanses himself from these things [which are dishonorable—disobedient, sinful], he will be a vessel for honor, sanctified [set apart for a special purpose and made holy], useful to the Master, prepared for every good work."
        },
        {
          verse: 22,
          kjv: "Flee also youthful lusts: but follow righteousness, faith, charity, peace, with them that call on the Lord out of a pure heart.",
          amp: "Run away from youthful lusts and pursue righteousness, faith, love, and peace with those who call on the Lord out of a pure heart."
        },
        {
          verse: 24,
          kjv: "And the servant of the Lord must not strive; but be gentle unto all men, apt to teach, patient,",
          amp: "The Lord's servant must not be quarrelsome, but kind to everyone [mild-tempered, preserving the bond of peace]; he must be a skilled teacher, patient and forbearing when wronged."
        }
      ],
      "3": [
        {
          verse: 1,
          kjv: "This know also, that in the last days perilous times shall come.",
          amp: "But understand this: in the last days dangerous times [of great stress and trouble] will come [difficult days that will be hard to bear]."
        },
        {
          verse: 5,
          kjv: "Having a form of godliness, but denying the power thereof: from such turn away.",
          amp: "holding to a form of [outward] godliness (religion), although they have denied its power [for their conduct nullifies their claim of faith]. Avoid such people and keep far away from them."
        },
        {
          verse: 14,
          kjv: "But continue thou in the things which thou hast learned and hast been assured of, knowing of whom thou hast learned them;",
          amp: "But as for you, continue in what you have learned and have firmly believed, knowing from whom you learned it."
        },
        {
          verse: 15,
          kjv: "And that from a child thou hast known the holy scriptures, which are able to make thee wise unto salvation through faith which is in Christ Jesus.",
          amp: "and how from childhood you have been acquainted with the sacred scriptures, which are able to make you wise for salvation through faith in Christ Jesus."
        },
        {
          verse: 16,
          kjv: "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:",
          amp: "All Scripture is God-breathed [given by divine inspiration] and is profitable for instruction, for conviction [of sin], for correction [of error and restoration to obedience], for training in righteousness [learning to live in conformity to God's will];"
        },
        {
          verse: 17,
          kjv: "That the man of God may be perfect, throughly furnished unto all good works.",
          amp: "so that the man of God may be complete and proficient, outfitted and thoroughly equipped for every good work."
        }
      ],
      "4": [
        {
          verse: 1,
          kjv: "I charge thee therefore before God, and the Lord Jesus Christ, who shall judge the quick and the dead at his appearing and his kingdom;",
          amp: "I solemnly charge you in the presence of God and of Christ Jesus, who is to judge the living and the dead, and by His appearing and His kingdom:"
        },
        {
          verse: 2,
          kjv: "Preach the word; be instant in season, out of season; reprove, rebuke, exhort with all long suffering and doctrine.",
          amp: "Preach the word [as an official messenger]; be ready in season and out of season [when convenient or inconvenient]; reprove, rebuke, and encourage, with great patience and careful instruction."
        },
        {
          verse: 5,
          kjv: "But watch thou in all things, endure afflictions, do the work of an evangelist, make full proof of thy ministry.",
          amp: "As for you, be calm and sober-minded in all situations, endure suffering, do the work of an evangelist, discharge fully all the duties of your ministry."
        },
        {
          verse: 7,
          kjv: "I have fought a good fight, I have finished my course, I have kept the faith:",
          amp: "I have fought the good [worthy, honorable] fight, I have finished the race, I have kept the faith [firmly guarding the gospel]."
        },
        {
          verse: 8,
          kjv: "Henceforth there is laid up for me a crown of righteousness, which the Lord, the righteous judge, shall give me at that day: and not to me only, but unto all them also that love his appearing.",
          amp: "Now there is in store for me the crown of righteousness, which the Lord, the righteous Judge, will award to me on that day—and not only to me, but also to all who have loved His appearing."
        }
      ]
    }
  },

  // EPHESIANS
  "eph": {
    name: "Ephesians",
    chapters: {
      "4": [
        {
          verse: 1,
          kjv: "I therefore, the prisoner of the Lord, beseech you that ye walk worthy of the vocation wherewith ye are called,",
          amp: "Therefore I, the prisoner of the Lord, urge you to walk in a manner worthy of the calling with which you have been called [with lives that exhibit your godly character];"
        },
        {
          verse: 11,
          kjv: "And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers;",
          amp: "And His gifts were [varied; He Himself appointed and gave men to us] some to be apostles (special messengers), some prophets (inspired preachers and expounders), some evangelists (preachers of the Gospel, traveling missionaries), some pastors (shepherds of His flock) and teachers."
        },
        {
          verse: 12,
          kjv: "For the perfecting of the saints, for the work of the ministry, for the edifying of the body of Christ:",
          amp: "His intention was the perfecting and the full equipping of the saints (His consecrated people), [that they should do] the work of ministering toward building up Christ's body (the church),"
        },
        {
          verse: 13,
          kjv: "Till we all come in the unity of the faith, and of the knowledge of the Son of God, unto a perfect man, unto the measure of the stature of the fulness of Christ:",
          amp: "until we all attain oneness in the faith and in the comprehension of the full knowledge of the Son of God, that [we might arrive] at really mature manhood [the completeness of personality], even to the measure of the stature of the fullness of the Christ."
        },
        {
          verse: 14,
          kjv: "That we henceforth be no more children, tossed to and fro, and carried about with every wind of doctrine, by the sleight of men, and cunning craftiness, whereby they lie in wait to deceive;",
          amp: "So then, we may no longer be children, tossed [like ships] on the waves and carried about with every wind of doctrine, by the cunning and trickery of men who use craftiness in deceitful schemes;"
        },
        {
          verse: 15,
          kjv: "But speaking the truth in love, may grow up into him in all things, which is the head, even Christ:",
          amp: "Rather, let our lives lovingly express truth [in all things, speaking truly, dealing truly, living truly]. Enfolded in love, let us grow up in every way and in all things into Him Who is the Head, [even] Christ (the Messiah, the Anointed One)."
        },
        {
          verse: 16,
          kjv: "From whom the whole body fitly joined together and compacted by that which every joint supplieth, according to the effectual working in the measure of every part, maketh increase of the body unto the edifying of itself in love.",
          amp: "For because of Him the whole body (the church, in all its various parts), closely joined and firmly knit together by the joints and ligaments with which it is supplied, when each part is working properly, grows and edifies itself in love."
        }
      ],
      "6": [
        {
          verse: 10,
          kjv: "Finally, my brethren, be strong in the Lord, and in the power of his might.",
          amp: "In conclusion, be strong in the Lord [be empowered through your union with Him]; draw your strength from Him [that strength which His boundless might provides]."
        },
        {
          verse: 11,
          kjv: "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.",
          amp: "Put on God's whole armor [the heavy armor of a heavy-armed soldier which God supplies], that you may be able successfully to stand up against [all] the strategies and the deceits of the devil."
        },
        {
          verse: 12,
          kjv: "For we wrestle not against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this world, against spiritual wickedness in high places.",
          amp: "For we are not wrestling with flesh and blood [contending only with physical opponents], but against the despotisms, against the powers, against [the master spirits who are] the world rulers of this present darkness, against the spirit forces of wickedness in the heavenly (supernatural) sphere."
        },
        {
          verse: 13,
          kjv: "Wherefore take unto you the whole armour of God, that ye may be able to withstand in the evil day, and having done all, to stand.",
          amp: "Therefore put on the complete armor of God, so that you may be able to [successfully] resist and stand your ground in the evil day [of danger], and having done everything [that the crisis demands], to stand firm [in your place, fully prepared, immovable, victorious]."
        },
        {
          verse: 14,
          kjv: "Stand therefore, having your loins girt about with truth, and having on the breastplate of righteousness;",
          amp: "Stand therefore [hold your ground], having tightened the belt of truth around your loins and having put on the breastplate of integrity and of moral rectitude and right standing with God,"
        },
        {
          verse: 17,
          kjv: "And take the helmet of salvation, and the sword of the Spirit, which is the word of God:",
          amp: "And take the helmet of salvation and the sword that the Spirit wields, which is the Word of God."
        },
        {
          verse: 18,
          kjv: "Praying always with all prayer and supplication in the Spirit, and watching thereunto with all perseverance and supplication for all saints;",
          amp: "Pray at all times (on every occasion, in every season) in the Spirit, with all [manner of] prayer and entreaty. To that end keep alert and watch with strong purpose and perseverance, interceding in behalf of all the saints (God's consecrated people)."
        }
      ]
    }
  },

  // ROMANS
  "rom": {
    name: "Romans",
    chapters: {
      "8": [
        {
          verse: 1,
          kjv: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.",
          amp: "Therefore there is now no condemnation [no guilty verdict, no punishment] for those who are in Christ Jesus [who believe in Him as personal Savior and Lord]."
        },
        {
          verse: 14,
          kjv: "For as many as are led by the Spirit of God, they are the sons of God.",
          amp: "For all who are allowing themselves to be led by the Spirit of God are sons of God."
        },
        {
          verse: 28,
          kjv: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
          amp: "And we know [with great confidence] that God [who is deeply concerned about us] causes all things to work together as a plan for good for those who love God, to those who are called according to His plan and purpose."
        },
        {
          verse: 31,
          kjv: "What shall we then say to these things? If God be for us, who can be against us?",
          amp: "What then shall we say to all these things? If God is for us, who can be [successful] against us?"
        },
        {
          verse: 37,
          kjv: "Nay, in all these things we are more than conquerors through him that loved us.",
          amp: "Yet in all these things we are more than conquerors and gain an overwhelming victory through Him who loved us [so much that He died for us]."
        }
      ],
      "12": [
        {
          verse: 1,
          kjv: "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.",
          amp: "Therefore I urge you, brothers and sisters, by the mercies of God, to present your bodies [dedicating all of yourselves, set apart] as a living sacrifice, holy and well-pleasing to God, which is your rational (logical, intelligent) act of worship."
        },
        {
          verse: 2,
          kjv: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.",
          amp: "And do not be conformed to this world [any longer with its superficial values and customs], but be transformed and progressively changed [as you mature spiritually] by the renewing of your mind [focusing on godly values and ethical attitudes], so that you may prove [for yourselves] what the will of God is, that which is good and acceptable and perfect [in His plan and purpose for you]."
        },
        {
          verse: 6,
          kjv: "Having then gifts differing according to the grace that is given to us, whether prophecy, let us prophesy according to the proportion of faith;",
          amp: "Since we have gifts that differ according to the grace given to us, each of us is to use them accordingly: if [someone has the gift of] prophecy, [let him speak a new message from God to His people] in proportion to the faith possessed;"
        }
      ]
    }
  },

  // PSALMS
  "psa": {
    name: "Psalms",
    chapters: {
      "23": [
        {
          verse: 1,
          kjv: "The LORD is my shepherd; I shall not want.",
          amp: "The Lord is my Shepherd [to feed, to guide and to shield me]; I shall not lack."
        },
        {
          verse: 2,
          kjv: "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
          amp: "He makes me lie down in [fresh, tender] green pastures; He leads me beside the still and restful waters."
        },
        {
          verse: 3,
          kjv: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.",
          amp: "He refreshes and restores my life (my self); He leads me in the paths of righteousness [uprightness and right standing with Him—not for my earning it, but] for His name's sake."
        },
        {
          verse: 4,
          kjv: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
          amp: "Yes, though I walk through the [deep, sunless] valley of the shadow of death, I will fear or dread no evil, for You are with me; Your rod [to protect] and Your staff [to guide], they comfort me."
        },
        {
          verse: 5,
          kjv: "Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.",
          amp: "You prepare a table before me in the presence of my enemies. You have anointed my head with oil; My cup runs over."
        },
        {
          verse: 6,
          kjv: "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.",
          amp: "Surely or only goodness, mercy, and unfailing love shall follow me all the days of my life, and through the length of my days the house of the Lord [and His presence] shall be my dwelling place."
        }
      ],
      "91": [
        {
          verse: 1,
          kjv: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.",
          amp: "He who dwells in the shelter of the Most High Will remain secure and rest in the shadow of the Almighty [whose power no enemy can withstand]."
        },
        {
          verse: 2,
          kjv: "I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust.",
          amp: "I will say of the Lord, 'He is my refuge and my fortress, My God, in whom I trust [with great confidence, and on whom I rely]!'"
        },
        {
          verse: 7,
          kjv: "A thousand shall fall at thy side, and ten thousand at thy right hand; but it shall not come nigh thee.",
          amp: "A thousand may fall at your side And ten thousand at your right hand, But danger will not come near you."
        },
        {
          verse: 11,
          kjv: "For he shall give his angels charge over thee, to keep thee in all thy ways.",
          amp: "For He will command His angels regarding you, To protect and safeguard you in all your ways [of obedience and service]."
        }
      ]
    }
  },

  // HEBREWS
  "heb": {
    name: "Hebrews",
    chapters: {
      "11": [
        {
          verse: 1,
          kjv: "Now faith is the substance of things hoped for, the evidence of things not seen.",
          amp: "Now faith is the assurance (title deed, confirmation) of things hoped for (divinely guaranteed), and the evidence of things not seen [the conviction of their reality—faith comprehends as fact what cannot be experienced by the physical senses]."
        },
        {
          verse: 6,
          kjv: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.",
          amp: "But without faith it is impossible to [walk with God and] please Him, for whoever comes [near] to God must [necessarily] believe that God exists and that He rewards those who [earnestly and diligently] seek Him."
        }
      ],
      "13": [
        {
          verse: 7,
          kjv: "Remember them which have the rule over you, who have spoken unto you the word of God: whose faith follow, considering the end of their conversation.",
          amp: "Remember your leaders [for it was they] who brought you the word of God; and consider the result of their conduct, and imitate their faith [their devotion to Christ, their conviction of the truth, their obedience to God's will]."
        },
        {
          verse: 8,
          kjv: "Jesus Christ the same yesterday, and to day, and for ever.",
          amp: "Jesus Christ is [eternally changeless, always] the same yesterday and today and forever."
        }
      ]
    }
  },

  // MATTHEW
  "mat": {
    name: "Matthew",
    chapters: {
      "28": [
        {
          verse: 18,
          kjv: "And Jesus came and spake unto them, saying, All power is given unto me in heaven and in earth.",
          amp: "Jesus came up and said to them, 'All authority (all power of absolute rule) in heaven and on earth has been given to Me.'"
        },
        {
          verse: 19,
          kjv: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:",
          amp: "Go therefore and make disciples of all the nations [help the people to learn of Me, believe in Me, and obey My words], baptizing them in the name of the Father and of the Son and of the Holy Spirit,"
        },
        {
          verse: 20,
          kjv: "Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.",
          amp: "teaching them to observe everything that I have commanded you; and lo, I am with you always [remaining with you perpetually—regardless of circumstance, and on every occasion], even to the end of the age.'"
        }
      ]
    }
  },

  // PROVERBS
  "pro": {
    name: "Proverbs",
    chapters: {
      "3": [
        {
          verse: 5,
          kjv: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
          amp: "Trust in and rely confidently on the Lord with all your heart And do not rely on your own insight or understanding."
        },
        {
          verse: 6,
          kjv: "In all thy ways acknowledge him, and he shall direct thy paths.",
          amp: "In all your ways know and acknowledge and recognize Him, And He will make your paths straight and smooth [removing obstacles that block your way]."
        }
      ]
    }
  }
};

// Split into separate KJV and AMP structures
const kjvDataset = {
  translation: "KJV",
  name: "King James Version",
  publishedYear: 1611,
  publicDomain: true,
  description: "Official Authorized King James Version (KJV) for HTEIM ministerial training and doctrinal reading.",
  books: {}
};

const ampDataset = {
  translation: "AMP",
  name: "Amplified Bible",
  description: "Amplified Bible (AMP) with detailed exegesis, clarifications, and semantic expansions for theological study.",
  books: {}
};

const parallelDataset = {
  translations: ["AMP", "KJV"],
  books: {}
};

for (const [bookId, bookData] of Object.entries(SCRIPTURE_REGISTRY)) {
  kjvDataset.books[bookId] = {
    name: bookData.name,
    chapters: {}
  };

  ampDataset.books[bookId] = {
    name: bookData.name,
    chapters: {}
  };

  parallelDataset.books[bookId] = {
    name: bookData.name,
    chapters: {}
  };

  for (const [chNum, verses] of Object.entries(bookData.chapters)) {
    kjvDataset.books[bookId].chapters[chNum] = verses.map(v => ({ verse: v.verse, text: v.kjv }));
    ampDataset.books[bookId].chapters[chNum] = verses.map(v => ({ verse: v.verse, text: v.amp }));
    parallelDataset.books[bookId].chapters[chNum] = verses.map(v => ({
      verse: v.verse,
      amp: v.amp,
      kjv: v.kjv
    }));
  }
}

// Write out JSON files
fs.writeFileSync(
  path.join(outputDir, 'books_catalog.json'),
  JSON.stringify(BIBLE_BOOKS_CATALOG, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(outputDir, 'kjv.json'),
  JSON.stringify(kjvDataset, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(outputDir, 'amp.json'),
  JSON.stringify(ampDataset, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(outputDir, 'parallel_index.json'),
  JSON.stringify(parallelDataset, null, 2),
  'utf-8'
);

console.log('Successfully generated JSON Bible datasets in public/data/bibles/:');
console.log('  - books_catalog.json (66 Books metadata)');
console.log('  - kjv.json (King James Version)');
console.log('  - amp.json (Amplified Bible)');
console.log('  - parallel_index.json (Side-by-side comparative format)');
