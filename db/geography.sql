-- GENERATED FILE — do not edit by hand.
--   node scripts/fetch-lgd-geography.js     rewrites it
--   npm run db:geography                    applies it
--
-- Source: Local Government Directory, Ministry of Panchayati Raj.
--   https://lgdirectory.gov.in/districtWiseDetailReport.do
-- Fetched 2026-07-19. 36 states and union territories, 784 districts.
--
-- Upserts keyed on lgd_code, so a district that LGD renames is renamed
-- here rather than duplicated, and nothing is ever deleted: a district
-- that disappears from LGD leaves rows behind it in other tables, and
-- dropping it would take published figures down with it. A merger is a
-- decision for a person, so this file makes it visible and leaves it.

BEGIN;

-- ------------------------------------------ states and union territories

INSERT INTO states (lgd_code, slug, name, kind) VALUES
  (35, 'andaman-and-nicobar-islands', 'Andaman and Nicobar Islands', 'ut_without_legislature'),
  (28, 'andhra-pradesh', 'Andhra Pradesh', 'state'),
  (12, 'arunachal-pradesh', 'Arunachal Pradesh', 'state'),
  (18, 'assam', 'Assam', 'state'),
  (10, 'bihar', 'Bihar', 'state'),
  (4, 'chandigarh', 'Chandigarh', 'ut_without_legislature'),
  (22, 'chhattisgarh', 'Chhattisgarh', 'state'),
  (38, 'dadra-and-nagar-haveli-and-daman-and-diu', 'Dadra and Nagar Haveli and Daman and Diu', 'ut_without_legislature'),
  (7, 'delhi', 'Delhi', 'ut_with_legislature'),
  (30, 'goa', 'Goa', 'state'),
  (24, 'gujarat', 'Gujarat', 'state'),
  (6, 'haryana', 'Haryana', 'state'),
  (2, 'himachal-pradesh', 'Himachal Pradesh', 'state'),
  (1, 'jammu-and-kashmir', 'Jammu and Kashmir', 'ut_with_legislature'),
  (20, 'jharkhand', 'Jharkhand', 'state'),
  (29, 'karnataka', 'Karnataka', 'state'),
  (32, 'kerala', 'Kerala', 'state'),
  (37, 'ladakh', 'Ladakh', 'ut_without_legislature'),
  (31, 'lakshadweep', 'Lakshadweep', 'ut_without_legislature'),
  (23, 'madhya-pradesh', 'Madhya Pradesh', 'state'),
  (27, 'maharashtra', 'Maharashtra', 'state'),
  (14, 'manipur', 'Manipur', 'state'),
  (17, 'meghalaya', 'Meghalaya', 'state'),
  (15, 'mizoram', 'Mizoram', 'state'),
  (13, 'nagaland', 'Nagaland', 'state'),
  (21, 'odisha', 'Odisha', 'state'),
  (34, 'puducherry', 'Puducherry', 'ut_with_legislature'),
  (3, 'punjab', 'Punjab', 'state'),
  (8, 'rajasthan', 'Rajasthan', 'state'),
  (11, 'sikkim', 'Sikkim', 'state'),
  (33, 'tamil-nadu', 'Tamil Nadu', 'state'),
  (36, 'telangana', 'Telangana', 'state'),
  (16, 'tripura', 'Tripura', 'state'),
  (9, 'uttar-pradesh', 'Uttar Pradesh', 'state'),
  (5, 'uttarakhand', 'Uttarakhand', 'state'),
  (19, 'west-bengal', 'West Bengal', 'state')
ON CONFLICT (slug) DO UPDATE SET
  lgd_code = EXCLUDED.lgd_code,
  name     = EXCLUDED.name,
  kind     = EXCLUDED.kind;

-- ------------------------------------------------------- adopting districts

-- The inserts below key on lgd_code, and the districts seeded before this
-- loader existed have none — so without this step Dehradun would be
-- proposed as a new row and collide with itself on (state_id, slug). This
-- attaches the code to a district we already hold, matching on the state
-- and slug that seeded it.
-- It touches only rows whose lgd_code is still NULL, which makes it a
-- no-op on every run after the first, and leaves Delhi's urban local
-- bodies alone: they are municipal units rather than LGD districts, they
-- match no slug here, and they are meant to stay codeless.
-- A later rename is NOT handled here and must not be. Once a district
-- carries its code, the insert updates it by that code, which is what
-- lets Allahabad become Prayagraj without becoming a second district.

UPDATE districts d SET lgd_code = v.lgd_code
FROM states s, (VALUES
  (35, 'nicobars', 603),
  (35, 'north-and-middle-andaman', 632),
  (35, 'south-andamans', 602),
  (28, 'alluri-sitharama-raju', 745),
  (28, 'anakapalli', 744),
  (28, 'ananthapuramu', 502),
  (28, 'annamayya', 753),
  (28, 'bapatla', 750),
  (28, 'chittoor', 503),
  (28, 'dr-b-r-ambedkar-konaseema', 747),
  (28, 'east-godavari', 505),
  (28, 'eluru', 748),
  (28, 'guntur', 506),
  (28, 'kakinada', 746),
  (28, 'krishna', 510),
  (28, 'kurnool', 511),
  (28, 'markapuram', 790),
  (28, 'nandyal', 755),
  (28, 'ntr', 749),
  (28, 'palnadu', 751),
  (28, 'parvathipuram-manyam', 743),
  (28, 'polavaram', 791),
  (28, 'prakasam', 517),
  (28, 'sri-potti-sriramulu-nellore', 515),
  (28, 'sri-sathya-sai', 754),
  (28, 'srikakulam', 519),
  (28, 'tirupati', 752),
  (28, 'visakhapatnam', 520),
  (28, 'vizianagaram', 521),
  (28, 'west-godavari', 523),
  (28, 'y-s-r-kadapa', 504),
  (12, 'anjaw', 628),
  (12, 'bichom', 787),
  (12, 'changlang', 229),
  (12, 'dibang-valley', 230),
  (12, 'east-kameng', 231),
  (12, 'east-siang', 232),
  (12, 'kamle', 718),
  (12, 'keyi-panyor', 786),
  (12, 'kra-daadi', 677),
  (12, 'kurung-kumey', 233),
  (12, 'leparada', 724),
  (12, 'lohit', 234),
  (12, 'longding', 666),
  (12, 'lower-dibang-valley', 235),
  (12, 'lower-siang', 719),
  (12, 'lower-subansiri', 236),
  (12, 'namsai', 678),
  (12, 'pakke-kessang', 723),
  (12, 'papum-pare', 237),
  (12, 'shi-yomi', 725),
  (12, 'siang', 679),
  (12, 'tawang', 238),
  (12, 'tirap', 239),
  (12, 'upper-siang', 240),
  (12, 'upper-subansiri', 241),
  (12, 'west-kameng', 242),
  (12, 'west-siang', 243),
  (18, 'bajali', 739),
  (18, 'baksa', 616),
  (18, 'barpeta', 280),
  (18, 'biswanath', 705),
  (18, 'bongaigaon', 281),
  (18, 'cachar', 282),
  (18, 'charaideo', 708),
  (18, 'chirang', 612),
  (18, 'darrang', 283),
  (18, 'dhemaji', 284),
  (18, 'dhubri', 285),
  (18, 'dibrugarh', 286),
  (18, 'dima-hasao', 299),
  (18, 'goalpara', 287),
  (18, 'golaghat', 288),
  (18, 'hailakandi', 289),
  (18, 'hojai', 709),
  (18, 'jorhat', 290),
  (18, 'kamrup', 291),
  (18, 'kamrup-metro', 618),
  (18, 'karbi-anglong', 292),
  (18, 'kokrajhar', 294),
  (18, 'lakhimpur', 295),
  (18, 'majuli', 706),
  (18, 'marigaon', 296),
  (18, 'nagaon', 297),
  (18, 'nalbari', 298),
  (18, 'sivasagar', 300),
  (18, 'sonitpur', 301),
  (18, 'south-salmara-mancachar', 707),
  (18, 'sribhumi', 293),
  (18, 'tamulpur', 756),
  (18, 'tinsukia', 302),
  (18, 'udalguri', 617),
  (18, 'west-karbi-anglong', 710),
  (10, 'araria', 188),
  (10, 'arwal', 611),
  (10, 'aurangabad', 189),
  (10, 'banka', 190),
  (10, 'begusarai', 191),
  (10, 'bhagalpur', 192),
  (10, 'bhojpur', 193),
  (10, 'buxar', 194),
  (10, 'darbhanga', 195),
  (10, 'gaya', 196),
  (10, 'gopalganj', 197),
  (10, 'jamui', 198),
  (10, 'jehanabad', 199),
  (10, 'kaimur-bhabua', 200),
  (10, 'katihar', 201),
  (10, 'khagaria', 202),
  (10, 'kishanganj', 203),
  (10, 'lakhisarai', 204),
  (10, 'madhepura', 205),
  (10, 'madhubani', 206),
  (10, 'munger', 207),
  (10, 'muzaffarpur', 208),
  (10, 'nalanda', 209),
  (10, 'nawada', 210),
  (10, 'pashchim-champaran', 211),
  (10, 'patna', 212),
  (10, 'purbi-champaran', 213),
  (10, 'purnia', 214),
  (10, 'rohtas', 215),
  (10, 'saharsa', 216),
  (10, 'samastipur', 217),
  (10, 'saran', 218),
  (10, 'sheikhpura', 219),
  (10, 'sheohar', 220),
  (10, 'sitamarhi', 221),
  (10, 'siwan', 222),
  (10, 'supaul', 223),
  (10, 'vaishali', 224),
  (4, 'chandigarh', 44),
  (22, 'balod', 646),
  (22, 'balodabazar-bhatapara', 644),
  (22, 'balrampur-ramanujganj', 649),
  (22, 'bastar', 374),
  (22, 'bemetara', 650),
  (22, 'bijapur', 636),
  (22, 'bilaspur', 375),
  (22, 'dakshin-bastar-dantewada', 376),
  (22, 'dhamtari', 377),
  (22, 'durg', 378),
  (22, 'gariyaband', 645),
  (22, 'gaurela-pendra-marwahi', 734),
  (22, 'janjgir-champa', 379),
  (22, 'jashpur', 380),
  (22, 'kabeerdham', 382),
  (22, 'khairagarh-chhuikhadan-gandai', 759),
  (22, 'kondagaon', 643),
  (22, 'korba', 383),
  (22, 'korea', 384),
  (22, 'mahasamund', 385),
  (22, 'manendragarh-chirmiri-bharatpur-m-c-b', 760),
  (22, 'mohla-manpur-ambagarh-chouki', 761),
  (22, 'mungeli', 647),
  (22, 'narayanpur', 637),
  (22, 'raigarh', 386),
  (22, 'raipur', 387),
  (22, 'rajnandgaon', 388),
  (22, 'sakti', 762),
  (22, 'sarangarh-bilaigarh', 763),
  (22, 'sukma', 642),
  (22, 'surajpur', 648),
  (22, 'surguja', 389),
  (22, 'uttar-bastar-kanker', 381),
  (38, 'dadra-and-nagar-haveli', 465),
  (38, 'daman', 463),
  (38, 'diu', 464),
  (7, 'central', 77),
  (7, 'central-north', 796),
  (7, 'east', 78),
  (7, 'new-delhi', 79),
  (7, 'north', 80),
  (7, 'north-east', 81),
  (7, 'north-west', 82),
  (7, 'old-delhi', 795),
  (7, 'outer-north', 794),
  (7, 'south', 83),
  (7, 'south-east', 670),
  (7, 'south-west', 84),
  (7, 'west', 85),
  (30, 'kushavati', 793),
  (30, 'north-goa', 551),
  (30, 'south-goa', 552),
  (24, 'ahmedabad', 438),
  (24, 'amreli', 439),
  (24, 'anand', 440),
  (24, 'arvalli', 672),
  (24, 'banas-kantha', 441),
  (24, 'bharuch', 442),
  (24, 'bhavnagar', 443),
  (24, 'botad', 676),
  (24, 'chhotaudepur', 668),
  (24, 'dahod', 445),
  (24, 'dangs', 444),
  (24, 'devbhumi-dwarka', 674),
  (24, 'gandhinagar', 446),
  (24, 'gir-somnath', 675),
  (24, 'jamnagar', 447),
  (24, 'junagadh', 448),
  (24, 'kachchh', 449),
  (24, 'kheda', 450),
  (24, 'mahesana', 451),
  (24, 'mahisagar', 669),
  (24, 'morbi', 673),
  (24, 'narmada', 452),
  (24, 'navsari', 453),
  (24, 'panch-mahals', 454),
  (24, 'patan', 455),
  (24, 'porbandar', 456),
  (24, 'rajkot', 457),
  (24, 'sabar-kantha', 458),
  (24, 'surat', 459),
  (24, 'surendranagar', 460),
  (24, 'tapi', 641),
  (24, 'vadodara', 461),
  (24, 'valsad', 462),
  (24, 'vav-tharad', 789),
  (6, 'ambala', 58),
  (6, 'bhiwani', 59),
  (6, 'charkhi-dadri', 701),
  (6, 'faridabad', 60),
  (6, 'fatehabad', 61),
  (6, 'gurugram', 62),
  (6, 'hansi', 792),
  (6, 'hisar', 63),
  (6, 'jhajjar', 64),
  (6, 'jind', 65),
  (6, 'kaithal', 66),
  (6, 'karnal', 67),
  (6, 'kurukshetra', 68),
  (6, 'mahendragarh', 69),
  (6, 'nuh', 604),
  (6, 'palwal', 619),
  (6, 'panchkula', 70),
  (6, 'panipat', 71),
  (6, 'rewari', 72),
  (6, 'rohtak', 73),
  (6, 'sirsa', 74),
  (6, 'sonipat', 75),
  (6, 'yamunanagar', 76),
  (2, 'bilaspur', 15),
  (2, 'chamba', 16),
  (2, 'hamirpur', 17),
  (2, 'kangra', 18),
  (2, 'kinnaur', 19),
  (2, 'kullu', 20),
  (2, 'lahaul-and-spiti', 21),
  (2, 'mandi', 22),
  (2, 'shimla', 23),
  (2, 'sirmaur', 24),
  (2, 'solan', 25),
  (2, 'una', 26),
  (1, 'anantnag', 1),
  (1, 'bandipora', 623),
  (1, 'baramulla', 3),
  (1, 'budgam', 2),
  (1, 'doda', 4),
  (1, 'ganderbal', 626),
  (1, 'jammu', 5),
  (1, 'kathua', 7),
  (1, 'kishtwar', 620),
  (1, 'kulgam', 622),
  (1, 'kupwara', 8),
  (1, 'poonch', 10),
  (1, 'pulwama', 11),
  (1, 'rajouri', 12),
  (1, 'ramban', 621),
  (1, 'reasi', 627),
  (1, 'samba', 624),
  (1, 'shopian', 625),
  (1, 'srinagar', 13),
  (1, 'udhampur', 14),
  (20, 'bokaro', 322),
  (20, 'chatra', 323),
  (20, 'deoghar', 324),
  (20, 'dhanbad', 325),
  (20, 'dumka', 326),
  (20, 'east-singhbum', 327),
  (20, 'garhwa', 328),
  (20, 'giridih', 329),
  (20, 'godda', 330),
  (20, 'gumla', 331),
  (20, 'hazaribagh', 332),
  (20, 'jamtara', 333),
  (20, 'khunti', 606),
  (20, 'koderma', 334),
  (20, 'latehar', 335),
  (20, 'lohardaga', 336),
  (20, 'pakur', 337),
  (20, 'palamu', 338),
  (20, 'ramgarh', 607),
  (20, 'ranchi', 339),
  (20, 'sahebganj', 340),
  (20, 'saraikela-kharsawan', 341),
  (20, 'simdega', 342),
  (20, 'west-singhbhum', 343),
  (29, 'bagalkote', 524),
  (29, 'ballari', 528),
  (29, 'belagavi', 527),
  (29, 'bengaluru-rural', 526),
  (29, 'bengaluru-south', 631),
  (29, 'bengaluru-urban', 525),
  (29, 'bidar', 529),
  (29, 'chamarajanagar', 531),
  (29, 'chikkaballapura', 630),
  (29, 'chikkamagaluru', 532),
  (29, 'chitradurga', 533),
  (29, 'dakshina-kannada', 534),
  (29, 'davanagere', 535),
  (29, 'dharwad', 536),
  (29, 'gadag', 537),
  (29, 'hassan', 539),
  (29, 'haveri', 540),
  (29, 'kalaburagi', 538),
  (29, 'kodagu', 541),
  (29, 'kolar', 542),
  (29, 'koppal', 543),
  (29, 'mandya', 544),
  (29, 'mysuru', 545),
  (29, 'raichur', 546),
  (29, 'shivamogga', 547),
  (29, 'tumakuru', 548),
  (29, 'udupi', 549),
  (29, 'uttara-kannada', 550),
  (29, 'vijayanagara', 738),
  (29, 'vijayapura', 530),
  (29, 'yadgir', 635),
  (32, 'alappuzha', 554),
  (32, 'ernakulam', 555),
  (32, 'idukki', 556),
  (32, 'kannur', 557),
  (32, 'kasaragod', 558),
  (32, 'kollam', 559),
  (32, 'kottayam', 560),
  (32, 'kozhikode', 561),
  (32, 'malappuram', 562),
  (32, 'palakkad', 563),
  (32, 'pathanamthitta', 564),
  (32, 'thiruvananthapuram', 565),
  (32, 'thrissur', 566),
  (32, 'wayanad', 567),
  (37, 'kargil', 6),
  (37, 'leh-ladakh', 9),
  (31, 'lakshadweep-district', 553),
  (23, 'agar-malwa', 667),
  (23, 'alirajpur', 639),
  (23, 'anuppur', 390),
  (23, 'ashoknagar', 391),
  (23, 'balaghat', 392),
  (23, 'barwani', 393),
  (23, 'betul', 394),
  (23, 'bhind', 395),
  (23, 'bhopal', 396),
  (23, 'burhanpur', 397),
  (23, 'chhatarpur', 398),
  (23, 'chhindwara', 399),
  (23, 'damoh', 400),
  (23, 'datia', 401),
  (23, 'dewas', 402),
  (23, 'dhar', 403),
  (23, 'dindori', 404),
  (23, 'guna', 406),
  (23, 'gwalior', 407),
  (23, 'harda', 408),
  (23, 'indore', 410),
  (23, 'jabalpur', 411),
  (23, 'jhabua', 412),
  (23, 'katni', 413),
  (23, 'khandwa-east-nimar', 405),
  (23, 'khargone-west-nimar', 414),
  (23, 'maihar', 784),
  (23, 'mandla', 415),
  (23, 'mandsaur', 416),
  (23, 'mauganj', 766),
  (23, 'morena', 417),
  (23, 'narmadapuram', 409),
  (23, 'narsimhapur', 418),
  (23, 'neemuch', 419),
  (23, 'niwari', 722),
  (23, 'pandhurna', 785),
  (23, 'panna', 420),
  (23, 'raisen', 421),
  (23, 'rajgarh', 422),
  (23, 'ratlam', 423),
  (23, 'rewa', 424),
  (23, 'sagar', 425),
  (23, 'satna', 426),
  (23, 'sehore', 427),
  (23, 'seoni', 428),
  (23, 'shahdol', 429),
  (23, 'shajapur', 430),
  (23, 'sheopur', 431),
  (23, 'shivpuri', 432),
  (23, 'sidhi', 433),
  (23, 'singrauli', 638),
  (23, 'tikamgarh', 434),
  (23, 'ujjain', 435),
  (23, 'umaria', 436),
  (23, 'vidisha', 437),
  (27, 'ahilyanagar', 466),
  (27, 'akola', 467),
  (27, 'amravati', 468),
  (27, 'beed', 470),
  (27, 'bhandara', 471),
  (27, 'buldhana', 472),
  (27, 'chandrapur', 473),
  (27, 'chhatrapati-sambhajinagar', 469),
  (27, 'dharashiv', 488),
  (27, 'dhule', 474),
  (27, 'gadchiroli', 475),
  (27, 'gondia', 476),
  (27, 'hingoli', 477),
  (27, 'jalgaon', 478),
  (27, 'jalna', 479),
  (27, 'kolhapur', 480),
  (27, 'latur', 481),
  (27, 'mumbai', 482),
  (27, 'mumbai-suburban', 483),
  (27, 'nagpur', 484),
  (27, 'nanded', 485),
  (27, 'nandurbar', 486),
  (27, 'nashik', 487),
  (27, 'palghar', 665),
  (27, 'parbhani', 489),
  (27, 'pune', 490),
  (27, 'raigad', 491),
  (27, 'ratnagiri', 492),
  (27, 'sangli', 493),
  (27, 'satara', 494),
  (27, 'sindhudurg', 495),
  (27, 'solapur', 496),
  (27, 'thane', 497),
  (27, 'wardha', 498),
  (27, 'washim', 499),
  (27, 'yavatmal', 500),
  (14, 'bishnupur', 252),
  (14, 'chandel', 253),
  (14, 'churachandpur', 254),
  (14, 'imphal-east', 255),
  (14, 'imphal-west', 256),
  (14, 'jiribam', 713),
  (14, 'kakching', 711),
  (14, 'kamjong', 717),
  (14, 'kangpokpi', 712),
  (14, 'noney', 714),
  (14, 'pherzawl', 715),
  (14, 'senapati', 257),
  (14, 'tamenglong', 258),
  (14, 'tengnoupal', 716),
  (14, 'thoubal', 259),
  (14, 'ukhrul', 260),
  (17, 'east-garo-hills', 273),
  (17, 'east-jaintia-hills', 657),
  (17, 'east-khasi-hills', 274),
  (17, 'eastern-west-khasi-hills', 740),
  (17, 'north-garo-hills', 656),
  (17, 'ri-bhoi', 276),
  (17, 'south-garo-hills', 277),
  (17, 'south-west-garo-hills', 663),
  (17, 'south-west-khasi-hills', 658),
  (17, 'west-garo-hills', 278),
  (17, 'west-jaintia-hills', 275),
  (17, 'west-khasi-hills', 279),
  (15, 'aizawl', 261),
  (15, 'champhai', 262),
  (15, 'hnahthial', 726),
  (15, 'khawzawl', 728),
  (15, 'kolasib', 263),
  (15, 'lawngtlai', 264),
  (15, 'lunglei', 265),
  (15, 'mamit', 266),
  (15, 'saitual', 727),
  (15, 'serchhip', 268),
  (15, 'siaha', 267),
  (13, 'chumoukedima', 758),
  (13, 'dimapur', 244),
  (13, 'kiphire', 614),
  (13, 'kohima', 245),
  (13, 'longleng', 615),
  (13, 'meluri', 788),
  (13, 'mokokchung', 246),
  (13, 'mon', 247),
  (13, 'niuland', 764),
  (13, 'noklak', 736),
  (13, 'peren', 613),
  (13, 'phek', 248),
  (13, 'shamator', 765),
  (13, 'tseminyu', 757),
  (13, 'tuensang', 249),
  (13, 'wokha', 250),
  (13, 'zunheboto', 251),
  (21, 'anugola', 344),
  (21, 'balangir', 345),
  (21, 'balasore', 346),
  (21, 'bargarh', 347),
  (21, 'bhadrak', 348),
  (21, 'boudh', 349),
  (21, 'deogarh', 351),
  (21, 'dhenkanal', 352),
  (21, 'gajapati', 353),
  (21, 'ganjam', 354),
  (21, 'jagatsinghapur', 355),
  (21, 'jajpur', 356),
  (21, 'jharsuguda', 357),
  (21, 'kalahandi', 358),
  (21, 'kandhamal', 359),
  (21, 'kataka', 350),
  (21, 'kendrapada', 360),
  (21, 'kendujhar', 361),
  (21, 'khordha', 362),
  (21, 'koraput', 363),
  (21, 'malkangiri', 364),
  (21, 'mayurbhanj', 365),
  (21, 'nabarangpur', 366),
  (21, 'nayagarh', 367),
  (21, 'nuapada', 368),
  (21, 'puri', 369),
  (21, 'rayagada', 370),
  (21, 'sambalpur', 371),
  (21, 'sonepur', 372),
  (21, 'sundaragada', 373),
  (34, 'karaikal', 598),
  (34, 'puducherry', 600),
  (3, 'amritsar', 27),
  (3, 'barnala', 605),
  (3, 'bathinda', 28),
  (3, 'faridkot', 29),
  (3, 'fatehgarh-sahib', 30),
  (3, 'fazilka', 651),
  (3, 'ferozepur', 31),
  (3, 'gurdaspur', 32),
  (3, 'hoshiarpur', 33),
  (3, 'jalandhar', 34),
  (3, 'kapurthala', 35),
  (3, 'ludhiana', 36),
  (3, 'malerkotla', 737),
  (3, 'mansa', 37),
  (3, 'moga', 38),
  (3, 'pathankot', 662),
  (3, 'patiala', 41),
  (3, 'rupnagar', 42),
  (3, 's-a-s-nagar', 608),
  (3, 'sangrur', 43),
  (3, 'shahid-bhagat-singh-nagar', 40),
  (3, 'sri-muktsar-sahib', 39),
  (3, 'tarn-taran', 609),
  (8, 'ajmer', 86),
  (8, 'alwar', 87),
  (8, 'balotra', 775),
  (8, 'banswara', 88),
  (8, 'baran', 89),
  (8, 'barmer', 90),
  (8, 'beawar', 774),
  (8, 'bharatpur', 91),
  (8, 'bhilwara', 92),
  (8, 'bikaner', 93),
  (8, 'bundi', 94),
  (8, 'chittorgarh', 95),
  (8, 'churu', 96),
  (8, 'dausa', 97),
  (8, 'deeg', 767),
  (8, 'dholpur', 98),
  (8, 'didwana-kuchaman', 768),
  (8, 'dungarpur', 99),
  (8, 'ganganagar', 100),
  (8, 'hanumangarh', 101),
  (8, 'jaipur', 102),
  (8, 'jaisalmer', 103),
  (8, 'jalore', 104),
  (8, 'jhalawar', 105),
  (8, 'jhunjhunu', 106),
  (8, 'jodhpur', 107),
  (8, 'karauli', 108),
  (8, 'khairthal-tijara', 770),
  (8, 'kota', 109),
  (8, 'kotputli-behror', 782),
  (8, 'nagaur', 110),
  (8, 'pali', 111),
  (8, 'phalodi', 772),
  (8, 'pratapgarh', 629),
  (8, 'rajsamand', 112),
  (8, 'salumbar', 777),
  (8, 'sawai-madhopur', 113),
  (8, 'sikar', 114),
  (8, 'sirohi', 115),
  (8, 'tonk', 116),
  (8, 'udaipur', 117),
  (11, 'gangtok', 225),
  (11, 'gyalshing', 228),
  (11, 'mangan', 226),
  (11, 'namchi', 227),
  (11, 'pakyong', 741),
  (11, 'soreng', 742),
  (33, 'ariyalur', 610),
  (33, 'chengalpattu', 730),
  (33, 'chennai', 568),
  (33, 'coimbatore', 569),
  (33, 'cuddalore', 570),
  (33, 'dharmapuri', 571),
  (33, 'dindigul', 572),
  (33, 'erode', 573),
  (33, 'kallakurichi', 729),
  (33, 'kancheepuram', 574),
  (33, 'kanniyakumari', 575),
  (33, 'karur', 576),
  (33, 'krishnagiri', 577),
  (33, 'madurai', 578),
  (33, 'mayiladuthurai', 735),
  (33, 'nagapattinam', 579),
  (33, 'namakkal', 580),
  (33, 'nilgiris', 587),
  (33, 'perambalur', 581),
  (33, 'pudukkottai', 582),
  (33, 'ramanathapuram', 583),
  (33, 'ranipet', 731),
  (33, 'salem', 584),
  (33, 'sivaganga', 585),
  (33, 'tenkasi', 733),
  (33, 'thanjavur', 586),
  (33, 'theni', 588),
  (33, 'thiruvallur', 589),
  (33, 'thiruvarur', 590),
  (33, 'thoothukkudi', 594),
  (33, 'tiruchirappalli', 591),
  (33, 'tirunelveli', 592),
  (33, 'tirupathur', 732),
  (33, 'tiruppur', 634),
  (33, 'tiruvannamalai', 593),
  (33, 'vellore', 595),
  (33, 'viluppuram', 596),
  (33, 'virudhunagar', 597),
  (36, 'adilabad', 501),
  (36, 'bhadradri-kothagudem', 690),
  (36, 'hanumakonda', 686),
  (36, 'hyderabad', 507),
  (36, 'jagitial', 681),
  (36, 'jangoan', 689),
  (36, 'jayashankar-bhupalapally', 687),
  (36, 'jogulamba-gadwal', 695),
  (36, 'kamareddy', 685),
  (36, 'karimnagar', 508),
  (36, 'khammam', 509),
  (36, 'kumuram-bheem-asifabad', 699),
  (36, 'mahabubabad', 688),
  (36, 'mahabubnagar', 512),
  (36, 'mancherial', 684),
  (36, 'medak', 513),
  (36, 'medchal-malkajgiri', 700),
  (36, 'mulugu', 720),
  (36, 'nagarkurnool', 694),
  (36, 'nalgonda', 514),
  (36, 'narayanpet', 721),
  (36, 'nirmal', 680),
  (36, 'nizamabad', 516),
  (36, 'peddapalli', 682),
  (36, 'rajanna-sircilla', 683),
  (36, 'ranga-reddy', 518),
  (36, 'sangareddy', 691),
  (36, 'siddipet', 692),
  (36, 'suryapet', 696),
  (36, 'vikarabad', 698),
  (36, 'wanaparthy', 693),
  (36, 'warangal', 522),
  (36, 'yadadri-bhuvanagiri', 697),
  (16, 'dhalai', 269),
  (16, 'gomati', 654),
  (16, 'khowai', 652),
  (16, 'north-tripura', 270),
  (16, 'sepahijala', 653),
  (16, 'south-tripura', 271),
  (16, 'unakoti', 655),
  (16, 'west-tripura', 272),
  (9, 'agra', 118),
  (9, 'aligarh', 119),
  (9, 'ambedkar-nagar', 121),
  (9, 'amethi', 640),
  (9, 'amroha', 154),
  (9, 'auraiya', 122),
  (9, 'ayodhya', 140),
  (9, 'azamgarh', 123),
  (9, 'baghpat', 124),
  (9, 'bahraich', 125),
  (9, 'ballia', 126),
  (9, 'balrampur', 127),
  (9, 'banda', 128),
  (9, 'bara-banki', 129),
  (9, 'bareilly', 130),
  (9, 'basti', 131),
  (9, 'bhadohi', 179),
  (9, 'bijnor', 132),
  (9, 'budaun', 133),
  (9, 'bulandshahr', 134),
  (9, 'chandauli', 135),
  (9, 'chitrakoot', 136),
  (9, 'deoria', 137),
  (9, 'etah', 138),
  (9, 'etawah', 139),
  (9, 'farrukhabad', 141),
  (9, 'fatehpur', 142),
  (9, 'firozabad', 143),
  (9, 'gautam-buddha-nagar', 144),
  (9, 'ghaziabad', 145),
  (9, 'ghazipur', 146),
  (9, 'gonda', 147),
  (9, 'gorakhpur', 148),
  (9, 'hamirpur', 149),
  (9, 'hapur', 661),
  (9, 'hardoi', 150),
  (9, 'hathras', 163),
  (9, 'jalaun', 151),
  (9, 'jaunpur', 152),
  (9, 'jhansi', 153),
  (9, 'kannauj', 155),
  (9, 'kanpur-dehat', 156),
  (9, 'kanpur-nagar', 157),
  (9, 'kasganj', 633),
  (9, 'kaushambi', 158),
  (9, 'kheri', 159),
  (9, 'kushinagar', 160),
  (9, 'lalitpur', 161),
  (9, 'lucknow', 162),
  (9, 'mahoba', 165),
  (9, 'mahrajganj', 164),
  (9, 'mainpuri', 166),
  (9, 'mathura', 167),
  (9, 'mau', 168),
  (9, 'meerut', 169),
  (9, 'mirzapur', 170),
  (9, 'moradabad', 171),
  (9, 'muzaffarnagar', 172),
  (9, 'pilibhit', 173),
  (9, 'pratapgarh', 174),
  (9, 'prayagraj', 120),
  (9, 'rae-bareli', 175),
  (9, 'rampur', 176),
  (9, 'saharanpur', 177),
  (9, 'sambhal', 659),
  (9, 'sant-kabir-nagar', 178),
  (9, 'shahjahanpur', 180),
  (9, 'shamli', 660),
  (9, 'shrawasti', 181),
  (9, 'siddharthnagar', 182),
  (9, 'sitapur', 183),
  (9, 'sonbhadra', 184),
  (9, 'sultanpur', 185),
  (9, 'unnao', 186),
  (9, 'varanasi', 187),
  (5, 'almora', 45),
  (5, 'bageshwar', 46),
  (5, 'chamoli', 47),
  (5, 'champawat', 48),
  (5, 'dehradun', 49),
  (5, 'haridwar', 50),
  (5, 'nainital', 51),
  (5, 'pauri-garhwal', 52),
  (5, 'pithoragarh', 53),
  (5, 'rudraprayag', 54),
  (5, 'tehri-garhwal', 55),
  (5, 'udham-singh-nagar', 56),
  (5, 'uttarkashi', 57),
  (19, 'alipurduar', 664),
  (19, 'bankura', 305),
  (19, 'birbhum', 307),
  (19, 'cooch-behar', 308),
  (19, 'dakshin-dinajpur', 310),
  (19, 'darjeeling', 309),
  (19, 'hooghly', 312),
  (19, 'howrah', 313),
  (19, 'jalpaiguri', 314),
  (19, 'jhargram', 703),
  (19, 'kalimpong', 702),
  (19, 'kolkata', 315),
  (19, 'malda', 316),
  (19, 'murshidabad', 319),
  (19, 'nadia', 320),
  (19, 'north-24-parganas', 303),
  (19, 'paschim-bardhaman', 704),
  (19, 'paschim-medinipur', 318),
  (19, 'purba-bardhaman', 306),
  (19, 'purba-medinipur', 317),
  (19, 'purulia', 321),
  (19, 'south-24-parganas', 304),
  (19, 'uttar-dinajpur', 311)
) AS v(state_lgd_code, slug, lgd_code)
WHERE s.lgd_code = v.state_lgd_code
  AND d.state_id = s.id
  AND d.slug     = v.slug
  AND d.lgd_code IS NULL;

-- --------------------------------------------------------------- districts

-- unit_type is district throughout: every row below is a revenue district
-- as LGD lists it. Delhi's urban local bodies, which the PMAY-U annexure
-- reports against, are seeded separately and are not LGD districts — they
-- carry no lgd_code and this file leaves them alone.

-- Andaman and Nicobar Islands — 3 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (603, 'nicobars', 'Nicobars', '2004-12-31'::date, 1),
  (632, 'north-and-middle-andaman', 'North and Middle Andaman', '2004-12-31'::date, 2),
  (602, 'south-andamans', 'South Andamans', '2004-12-31'::date, 3)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 35
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Andhra Pradesh — 28 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (745, 'alluri-sitharama-raju', 'Alluri Sitharama Raju', '2026-01-19'::date, 1),
  (744, 'anakapalli', 'Anakapalli', '2022-04-03'::date, 2),
  (502, 'ananthapuramu', 'Ananthapuramu', '2013-04-17'::date, 3),
  (753, 'annamayya', 'Annamayya', '2025-12-29'::date, 4),
  (750, 'bapatla', 'Bapatla', '2022-04-03'::date, 5),
  (503, 'chittoor', 'Chittoor', '2022-04-03'::date, 6),
  (747, 'dr-b-r-ambedkar-konaseema', 'Dr. B.R. Ambedkar Konaseema', '2022-08-01'::date, 7),
  (505, 'east-godavari', 'East Godavari', '2022-04-05'::date, 8),
  (748, 'eluru', 'Eluru', '2022-04-03'::date, 9),
  (506, 'guntur', 'Guntur', '2022-04-03'::date, 10),
  (746, 'kakinada', 'Kakinada', '2022-04-03'::date, 11),
  (510, 'krishna', 'Krishna', '2022-04-04'::date, 12),
  (511, 'kurnool', 'Kurnool', '2022-04-03'::date, 13),
  (790, 'markapuram', 'Markapuram', '2025-12-29'::date, 14),
  (755, 'nandyal', 'Nandyal', '2022-04-03'::date, 15),
  (749, 'ntr', 'Ntr', '2022-04-03'::date, 16),
  (751, 'palnadu', 'Palnadu', '2022-04-03'::date, 17),
  (743, 'parvathipuram-manyam', 'Parvathipuram Manyam', '2022-04-03'::date, 18),
  (791, 'polavaram', 'Polavaram', '2025-12-29'::date, 19),
  (517, 'prakasam', 'Prakasam', '2026-01-19'::date, 20),
  (515, 'sri-potti-sriramulu-nellore', 'Sri Potti Sriramulu Nellore', '2008-05-28'::date, 21),
  (754, 'sri-sathya-sai', 'Sri Sathya Sai', '2022-04-03'::date, 22),
  (519, 'srikakulam', 'Srikakulam', '2022-04-03'::date, 23),
  (752, 'tirupati', 'Tirupati', '2022-04-03'::date, 24),
  (520, 'visakhapatnam', 'Visakhapatnam', '2022-04-03'::date, 25),
  (521, 'vizianagaram', 'Vizianagaram', '2022-04-03'::date, 26),
  (523, 'west-godavari', 'West Godavari', '2022-04-05'::date, 27),
  (504, 'y-s-r-kadapa', 'Y.S.R. Kadapa', '2025-05-25'::date, 28)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 28
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Arunachal Pradesh — 27 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (628, 'anjaw', 'Anjaw', '2004-12-31'::date, 1),
  (787, 'bichom', 'Bichom', '2025-01-09'::date, 2),
  (229, 'changlang', 'Changlang', '2004-12-31'::date, 3),
  (230, 'dibang-valley', 'Dibang Valley', '2004-12-31'::date, 4),
  (231, 'east-kameng', 'East Kameng', '2025-01-10'::date, 5),
  (232, 'east-siang', 'East Siang', '2018-10-15'::date, 6),
  (718, 'kamle', 'Kamle', '2017-12-03'::date, 7),
  (786, 'keyi-panyor', 'Keyi Panyor', '2024-11-24'::date, 8),
  (677, 'kra-daadi', 'Kra Daadi', '2018-11-28'::date, 9),
  (233, 'kurung-kumey', 'Kurung Kumey', '2016-06-03'::date, 10),
  (724, 'leparada', 'Leparada', '2018-10-04'::date, 11),
  (234, 'lohit', 'Lohit', '2016-06-03'::date, 12),
  (666, 'longding', 'Longding', '2014-10-23'::date, 13),
  (235, 'lower-dibang-valley', 'Lower Dibang Valley', '2004-12-31'::date, 14),
  (719, 'lower-siang', 'Lower Siang', '2019-08-29'::date, 15),
  (236, 'lower-subansiri', 'Lower Subansiri', '2025-01-10'::date, 16),
  (678, 'namsai', 'Namsai', '2015-06-23'::date, 17),
  (723, 'pakke-kessang', 'Pakke Kessang', '2018-10-04'::date, 18),
  (237, 'papum-pare', 'Papum Pare', '2004-12-31'::date, 19),
  (725, 'shi-yomi', 'Shi Yomi', '2018-10-04'::date, 20),
  (679, 'siang', 'Siang', '2015-06-23'::date, 21),
  (238, 'tawang', 'Tawang', '2004-12-31'::date, 22),
  (239, 'tirap', 'Tirap', '2014-10-23'::date, 23),
  (240, 'upper-siang', 'Upper Siang', '2004-12-31'::date, 24),
  (241, 'upper-subansiri', 'Upper Subansiri', '2018-10-11'::date, 25),
  (242, 'west-kameng', 'West Kameng', '2025-01-10'::date, 26),
  (243, 'west-siang', 'West Siang', '2019-08-29'::date, 27)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 12
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Assam — 35 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (739, 'bajali', 'Bajali', '2021-01-11'::date, 1),
  (616, 'baksa', 'Baksa', '2022-07-11'::date, 2),
  (280, 'barpeta', 'Barpeta', '2022-01-17'::date, 3),
  (705, 'biswanath', 'Biswanath', '2016-01-24'::date, 4),
  (281, 'bongaigaon', 'Bongaigaon', '2004-12-31'::date, 5),
  (282, 'cachar', 'Cachar', '2004-12-31'::date, 6),
  (708, 'charaideo', 'Charaideo', '2016-01-24'::date, 7),
  (612, 'chirang', 'Chirang', '2004-12-31'::date, 8),
  (283, 'darrang', 'Darrang', '2004-12-31'::date, 9),
  (284, 'dhemaji', 'Dhemaji', '2004-12-31'::date, 10),
  (285, 'dhubri', 'Dhubri', '2017-07-08'::date, 11),
  (286, 'dibrugarh', 'Dibrugarh', '2004-12-31'::date, 12),
  (299, 'dima-hasao', 'Dima Hasao', '2014-03-31'::date, 13),
  (287, 'goalpara', 'Goalpara', '2004-12-31'::date, 14),
  (288, 'golaghat', 'Golaghat', '2004-12-31'::date, 15),
  (289, 'hailakandi', 'Hailakandi', '2004-12-31'::date, 16),
  (709, 'hojai', 'Hojai', '2016-01-24'::date, 17),
  (290, 'jorhat', 'Jorhat', '2017-07-08'::date, 18),
  (291, 'kamrup', 'Kamrup', '2004-12-31'::date, 19),
  (618, 'kamrup-metro', 'Kamrup Metro', '2004-12-31'::date, 20),
  (292, 'karbi-anglong', 'Karbi Anglong', '2017-07-08'::date, 21),
  (294, 'kokrajhar', 'Kokrajhar', '2004-12-31'::date, 22),
  (295, 'lakhimpur', 'Lakhimpur', '2004-12-31'::date, 23),
  (706, 'majuli', 'Majuli', '2016-08-04'::date, 24),
  (296, 'marigaon', 'Marigaon', '2004-12-31'::date, 25),
  (297, 'nagaon', 'Nagaon', '2017-07-08'::date, 26),
  (298, 'nalbari', 'Nalbari', '2004-12-31'::date, 27),
  (300, 'sivasagar', 'Sivasagar', '2017-07-08'::date, 28),
  (301, 'sonitpur', 'Sonitpur', '2017-07-08'::date, 29),
  (707, 'south-salmara-mancachar', 'South Salmara Mancachar', '2016-01-24'::date, 30),
  (293, 'sribhumi', 'Sribhumi', '2024-11-20'::date, 31),
  (756, 'tamulpur', 'Tamulpur', '2022-01-22'::date, 32),
  (302, 'tinsukia', 'Tinsukia', '2004-12-31'::date, 33),
  (617, 'udalguri', 'Udalguri', '2004-12-31'::date, 34),
  (710, 'west-karbi-anglong', 'West Karbi Anglong', '2016-01-24'::date, 35)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 18
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Bihar — 38 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (188, 'araria', 'Araria', '2005-01-01'::date, 1),
  (611, 'arwal', 'Arwal', '2004-12-31'::date, 2),
  (189, 'aurangabad', 'Aurangabad', '2004-12-31'::date, 3),
  (190, 'banka', 'Banka', '2004-12-31'::date, 4),
  (191, 'begusarai', 'Begusarai', '2004-12-31'::date, 5),
  (192, 'bhagalpur', 'Bhagalpur', '2004-12-31'::date, 6),
  (193, 'bhojpur', 'Bhojpur', '2004-12-31'::date, 7),
  (194, 'buxar', 'Buxar', '2004-12-31'::date, 8),
  (195, 'darbhanga', 'Darbhanga', '2004-12-31'::date, 9),
  (196, 'gaya', 'Gaya', '2004-12-31'::date, 10),
  (197, 'gopalganj', 'Gopalganj', '2004-12-31'::date, 11),
  (198, 'jamui', 'Jamui', '2004-12-31'::date, 12),
  (199, 'jehanabad', 'Jehanabad', '2004-12-31'::date, 13),
  (200, 'kaimur-bhabua', 'Kaimur (Bhabua)', '2004-12-31'::date, 14),
  (201, 'katihar', 'Katihar', '2004-12-31'::date, 15),
  (202, 'khagaria', 'Khagaria', '2004-12-31'::date, 16),
  (203, 'kishanganj', 'Kishanganj', '2004-12-31'::date, 17),
  (204, 'lakhisarai', 'Lakhisarai', '2004-12-31'::date, 18),
  (205, 'madhepura', 'Madhepura', '2004-12-31'::date, 19),
  (206, 'madhubani', 'Madhubani', '2004-12-31'::date, 20),
  (207, 'munger', 'Munger', '2004-12-31'::date, 21),
  (208, 'muzaffarpur', 'Muzaffarpur', '2004-12-31'::date, 22),
  (209, 'nalanda', 'Nalanda', '2004-12-31'::date, 23),
  (210, 'nawada', 'Nawada', '2004-12-31'::date, 24),
  (211, 'pashchim-champaran', 'Pashchim Champaran', '2004-12-31'::date, 25),
  (212, 'patna', 'Patna', '2004-12-31'::date, 26),
  (213, 'purbi-champaran', 'Purbi Champaran', '2004-12-31'::date, 27),
  (214, 'purnia', 'Purnia', '2004-12-31'::date, 28),
  (215, 'rohtas', 'Rohtas', '2004-12-31'::date, 29),
  (216, 'saharsa', 'Saharsa', '2004-12-31'::date, 30),
  (217, 'samastipur', 'Samastipur', '2004-12-31'::date, 31),
  (218, 'saran', 'Saran', '2004-12-31'::date, 32),
  (219, 'sheikhpura', 'Sheikhpura', '2004-12-31'::date, 33),
  (220, 'sheohar', 'Sheohar', '2004-12-31'::date, 34),
  (221, 'sitamarhi', 'Sitamarhi', '2004-12-31'::date, 35),
  (222, 'siwan', 'Siwan', '2004-12-31'::date, 36),
  (223, 'supaul', 'Supaul', '2004-12-31'::date, 37),
  (224, 'vaishali', 'Vaishali', '2004-12-31'::date, 38)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 10
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Chandigarh — 1 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (44, 'chandigarh', 'Chandigarh', '2004-12-31'::date, 1)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 4
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Chhattisgarh — 33 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (646, 'balod', 'Balod', '2004-12-31'::date, 1),
  (644, 'balodabazar-bhatapara', 'Balodabazar-Bhatapara', '2022-09-22'::date, 2),
  (649, 'balrampur-ramanujganj', 'Balrampur-Ramanujganj', '2024-05-16'::date, 3),
  (374, 'bastar', 'Bastar', '2004-12-31'::date, 4),
  (650, 'bemetara', 'Bemetara', '2004-12-31'::date, 5),
  (636, 'bijapur', 'Bijapur', '2004-12-31'::date, 6),
  (375, 'bilaspur', 'Bilaspur', '2019-12-30'::date, 7),
  (376, 'dakshin-bastar-dantewada', 'Dakshin Bastar Dantewada', '2004-12-31'::date, 8),
  (377, 'dhamtari', 'Dhamtari', '2004-12-31'::date, 9),
  (378, 'durg', 'Durg', '2004-12-31'::date, 10),
  (645, 'gariyaband', 'Gariyaband', '2004-12-31'::date, 11),
  (734, 'gaurela-pendra-marwahi', 'Gaurela-Pendra-Marwahi', '2024-05-15'::date, 12),
  (379, 'janjgir-champa', 'Janjgir-Champa', '2022-09-23'::date, 13),
  (380, 'jashpur', 'Jashpur', '2004-12-31'::date, 14),
  (382, 'kabeerdham', 'Kabeerdham', '2004-12-31'::date, 15),
  (759, 'khairagarh-chhuikhadan-gandai', 'Khairagarh-Chhuikhadan-Gandai', '2024-05-15'::date, 16),
  (643, 'kondagaon', 'Kondagaon', '2004-12-31'::date, 17),
  (383, 'korba', 'Korba', '2004-12-31'::date, 18),
  (384, 'korea', 'Korea', '2022-09-23'::date, 19),
  (385, 'mahasamund', 'Mahasamund', '2004-12-31'::date, 20),
  (760, 'manendragarh-chirmiri-bharatpur-m-c-b', 'Manendragarh-Chirmiri-Bharatpur(M C B)', '2024-05-16'::date, 21),
  (761, 'mohla-manpur-ambagarh-chouki', 'Mohla-Manpur-Ambagarh Chouki', '2024-05-16'::date, 22),
  (647, 'mungeli', 'Mungeli', '2004-12-31'::date, 23),
  (637, 'narayanpur', 'Narayanpur', '2004-12-31'::date, 24),
  (386, 'raigarh', 'Raigarh', '2022-09-23'::date, 25),
  (387, 'raipur', 'Raipur', '2004-12-31'::date, 26),
  (388, 'rajnandgaon', 'Rajnandgaon', '2022-09-23'::date, 27),
  (762, 'sakti', 'Sakti', '2022-08-31'::date, 28),
  (763, 'sarangarh-bilaigarh', 'Sarangarh-Bilaigarh', '2024-05-16'::date, 29),
  (642, 'sukma', 'Sukma', '2004-12-31'::date, 30),
  (648, 'surajpur', 'Surajpur', '2004-12-31'::date, 31),
  (389, 'surguja', 'Surguja', '2004-12-31'::date, 32),
  (381, 'uttar-bastar-kanker', 'Uttar Bastar Kanker', '2004-12-31'::date, 33)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 22
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Dadra and Nagar Haveli and Daman and Diu — 3 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (465, 'dadra-and-nagar-haveli', 'Dadra and Nagar Haveli', '2019-12-08'::date, 1),
  (463, 'daman', 'Daman', '2019-12-08'::date, 2),
  (464, 'diu', 'Diu', '2019-12-08'::date, 3)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 38
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Delhi — 13 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (77, 'central', 'Central', '2026-03-24'::date, 1),
  (796, 'central-north', 'Central North', '2025-12-24'::date, 2),
  (78, 'east', 'East', '2015-06-16'::date, 3),
  (79, 'new-delhi', 'New Delhi', '2004-12-31'::date, 4),
  (80, 'north', 'North', '2026-03-24'::date, 5),
  (81, 'north-east', 'North East', '2015-06-16'::date, 6),
  (82, 'north-west', 'North West', '2026-03-24'::date, 7),
  (795, 'old-delhi', 'Old Delhi', '2025-12-24'::date, 8),
  (794, 'outer-north', 'Outer North', '2025-12-24'::date, 9),
  (83, 'south', 'South', '2015-06-10'::date, 10),
  (670, 'south-east', 'South East', '2012-09-10'::date, 11),
  (84, 'south-west', 'South West', '2004-12-31'::date, 12),
  (85, 'west', 'West', '2026-03-24'::date, 13)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 7
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Goa — 3 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (793, 'kushavati', 'Kushavati', '2025-12-30'::date, 1),
  (551, 'north-goa', 'North Goa', '2004-12-31'::date, 2),
  (552, 'south-goa', 'South Goa', '2026-01-22'::date, 3)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 30
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Gujarat — 34 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (438, 'ahmedabad', 'Ahmedabad', '2016-04-08'::date, 1),
  (439, 'amreli', 'Amreli', '2004-12-31'::date, 2),
  (440, 'anand', 'Anand', '2004-12-31'::date, 3),
  (672, 'arvalli', 'Arvalli', '2013-08-12'::date, 4),
  (441, 'banas-kantha', 'Banas Kantha', '2025-11-11'::date, 5),
  (442, 'bharuch', 'Bharuch', '2004-12-31'::date, 6),
  (443, 'bhavnagar', 'Bhavnagar', '2016-04-08'::date, 7),
  (676, 'botad', 'Botad', '2013-08-14'::date, 8),
  (668, 'chhotaudepur', 'Chhotaudepur', '2015-01-09'::date, 9),
  (445, 'dahod', 'Dahod', '2004-12-31'::date, 10),
  (444, 'dangs', 'Dangs', '2004-12-31'::date, 11),
  (674, 'devbhumi-dwarka', 'Devbhumi Dwarka', '2013-08-14'::date, 12),
  (446, 'gandhinagar', 'Gandhinagar', '2004-12-31'::date, 13),
  (675, 'gir-somnath', 'Gir Somnath', '2013-08-14'::date, 14),
  (447, 'jamnagar', 'Jamnagar', '2016-04-08'::date, 15),
  (448, 'junagadh', 'Junagadh', '2016-04-08'::date, 16),
  (449, 'kachchh', 'Kachchh', '2004-12-31'::date, 17),
  (450, 'kheda', 'Kheda', '2015-01-09'::date, 18),
  (451, 'mahesana', 'Mahesana', '2004-12-31'::date, 19),
  (669, 'mahisagar', 'Mahisagar', '2015-01-09'::date, 20),
  (673, 'morbi', 'Morbi', '2013-08-14'::date, 21),
  (452, 'narmada', 'Narmada', '2004-12-31'::date, 22),
  (453, 'navsari', 'Navsari', '2004-12-31'::date, 23),
  (454, 'panch-mahals', 'Panch Mahals', '2015-01-09'::date, 24),
  (455, 'patan', 'Patan', '2004-12-31'::date, 25),
  (456, 'porbandar', 'Porbandar', '2004-12-31'::date, 26),
  (457, 'rajkot', 'Rajkot', '2016-04-06'::date, 27),
  (458, 'sabar-kantha', 'Sabar Kantha', '2015-07-03'::date, 28),
  (459, 'surat', 'Surat', '2004-12-31'::date, 29),
  (460, 'surendranagar', 'Surendranagar', '2016-04-06'::date, 30),
  (641, 'tapi', 'Tapi', '2004-12-31'::date, 31),
  (461, 'vadodara', 'Vadodara', '2015-01-09'::date, 32),
  (462, 'valsad', 'Valsad', '2004-12-31'::date, 33),
  (789, 'vav-tharad', 'Vav-Tharad', '2025-09-23'::date, 34)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 24
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Haryana — 23 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (58, 'ambala', 'Ambala', '2004-12-31'::date, 1),
  (59, 'bhiwani', 'Bhiwani', '2016-12-29'::date, 2),
  (701, 'charkhi-dadri', 'Charkhi Dadri', '2024-11-11'::date, 3),
  (60, 'faridabad', 'Faridabad', '2004-12-31'::date, 4),
  (61, 'fatehabad', 'Fatehabad', '2004-12-31'::date, 5),
  (62, 'gurugram', 'Gurugram', '2017-01-09'::date, 6),
  (792, 'hansi', 'Hansi', '2025-12-18'::date, 7),
  (63, 'hisar', 'Hisar', '2026-01-20'::date, 8),
  (64, 'jhajjar', 'Jhajjar', '2004-12-31'::date, 9),
  (65, 'jind', 'Jind', '2004-12-31'::date, 10),
  (66, 'kaithal', 'Kaithal', '2004-12-31'::date, 11),
  (67, 'karnal', 'Karnal', '2004-12-31'::date, 12),
  (68, 'kurukshetra', 'Kurukshetra', '2004-12-31'::date, 13),
  (69, 'mahendragarh', 'Mahendragarh', '2004-12-31'::date, 14),
  (604, 'nuh', 'Nuh', '2016-11-15'::date, 15),
  (619, 'palwal', 'Palwal', '2004-12-31'::date, 16),
  (70, 'panchkula', 'Panchkula', '2004-12-31'::date, 17),
  (71, 'panipat', 'Panipat', '2004-12-31'::date, 18),
  (72, 'rewari', 'Rewari', '2004-12-31'::date, 19),
  (73, 'rohtak', 'Rohtak', '2004-12-31'::date, 20),
  (74, 'sirsa', 'Sirsa', '2004-12-31'::date, 21),
  (75, 'sonipat', 'Sonipat', '2004-12-31'::date, 22),
  (76, 'yamunanagar', 'Yamunanagar', '2004-12-31'::date, 23)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 6
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Himachal Pradesh — 12 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (15, 'bilaspur', 'Bilaspur', '2004-12-31'::date, 1),
  (16, 'chamba', 'Chamba', '2004-12-31'::date, 2),
  (17, 'hamirpur', 'Hamirpur', '2004-12-31'::date, 3),
  (18, 'kangra', 'Kangra', '2004-12-31'::date, 4),
  (19, 'kinnaur', 'Kinnaur', '2004-12-31'::date, 5),
  (20, 'kullu', 'Kullu', '2004-12-31'::date, 6),
  (21, 'lahaul-and-spiti', 'Lahaul and Spiti', '2023-10-26'::date, 7),
  (22, 'mandi', 'Mandi', '2004-12-31'::date, 8),
  (23, 'shimla', 'Shimla', '2004-12-31'::date, 9),
  (24, 'sirmaur', 'Sirmaur', '2004-12-31'::date, 10),
  (25, 'solan', 'Solan', '2004-12-31'::date, 11),
  (26, 'una', 'Una', '2004-12-31'::date, 12)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 2
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Jammu and Kashmir — 20 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (1, 'anantnag', 'Anantnag', '2004-12-31'::date, 1),
  (623, 'bandipora', 'Bandipora', '2004-12-31'::date, 2),
  (3, 'baramulla', 'Baramulla', '2014-10-20'::date, 3),
  (2, 'budgam', 'Budgam', '2014-10-20'::date, 4),
  (4, 'doda', 'Doda', '2004-12-31'::date, 5),
  (626, 'ganderbal', 'Ganderbal', '2004-12-31'::date, 6),
  (5, 'jammu', 'Jammu', '2004-12-31'::date, 7),
  (7, 'kathua', 'Kathua', '2004-12-31'::date, 8),
  (620, 'kishtwar', 'Kishtwar', '2004-12-31'::date, 9),
  (622, 'kulgam', 'Kulgam', '2004-12-31'::date, 10),
  (8, 'kupwara', 'Kupwara', '2004-12-31'::date, 11),
  (10, 'poonch', 'Poonch', '2004-12-31'::date, 12),
  (11, 'pulwama', 'Pulwama', '2004-12-31'::date, 13),
  (12, 'rajouri', 'Rajouri', '2014-10-20'::date, 14),
  (621, 'ramban', 'Ramban', '2004-12-31'::date, 15),
  (627, 'reasi', 'Reasi', '2004-12-31'::date, 16),
  (624, 'samba', 'Samba', '2004-12-31'::date, 17),
  (625, 'shopian', 'Shopian', '2004-12-31'::date, 18),
  (13, 'srinagar', 'Srinagar', '2004-12-31'::date, 19),
  (14, 'udhampur', 'Udhampur', '2004-12-31'::date, 20)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 1
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Jharkhand — 24 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (322, 'bokaro', 'Bokaro', '2004-12-31'::date, 1),
  (323, 'chatra', 'Chatra', '2004-12-31'::date, 2),
  (324, 'deoghar', 'Deoghar', '2004-12-31'::date, 3),
  (325, 'dhanbad', 'Dhanbad', '2004-12-31'::date, 4),
  (326, 'dumka', 'Dumka', '2004-12-31'::date, 5),
  (327, 'east-singhbum', 'East Singhbum', '2004-12-31'::date, 6),
  (328, 'garhwa', 'Garhwa', '2004-12-31'::date, 7),
  (329, 'giridih', 'Giridih', '2004-12-31'::date, 8),
  (330, 'godda', 'Godda', '2004-12-31'::date, 9),
  (331, 'gumla', 'Gumla', '2004-12-31'::date, 10),
  (332, 'hazaribagh', 'Hazaribagh', '2004-12-31'::date, 11),
  (333, 'jamtara', 'Jamtara', '2004-12-31'::date, 12),
  (606, 'khunti', 'Khunti', '2004-12-31'::date, 13),
  (334, 'koderma', 'Koderma', '2004-12-31'::date, 14),
  (335, 'latehar', 'Latehar', '2004-12-31'::date, 15),
  (336, 'lohardaga', 'Lohardaga', '2004-12-31'::date, 16),
  (337, 'pakur', 'Pakur', '2004-12-31'::date, 17),
  (338, 'palamu', 'Palamu', '2004-12-31'::date, 18),
  (607, 'ramgarh', 'Ramgarh', '2004-12-31'::date, 19),
  (339, 'ranchi', 'Ranchi', '2004-12-31'::date, 20),
  (340, 'sahebganj', 'Sahebganj', '2004-12-31'::date, 21),
  (341, 'saraikela-kharsawan', 'Saraikela Kharsawan', '2004-12-31'::date, 22),
  (342, 'simdega', 'Simdega', '2004-12-31'::date, 23),
  (343, 'west-singhbhum', 'West Singhbhum', '2004-12-31'::date, 24)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 20
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Karnataka — 31 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (524, 'bagalkote', 'Bagalkote', '2015-02-03'::date, 1),
  (528, 'ballari', 'Ballari', '2021-11-15'::date, 2),
  (527, 'belagavi', 'Belagavi', '2015-01-14'::date, 3),
  (526, 'bengaluru-rural', 'Bengaluru Rural', '2015-01-14'::date, 4),
  (631, 'bengaluru-south', 'Bengaluru South', '2025-05-22'::date, 5),
  (525, 'bengaluru-urban', 'Bengaluru Urban', '2004-12-31'::date, 6),
  (529, 'bidar', 'Bidar', '2004-12-31'::date, 7),
  (531, 'chamarajanagar', 'Chamarajanagar', '2015-02-03'::date, 8),
  (630, 'chikkaballapura', 'Chikkaballapura', '2015-02-03'::date, 9),
  (532, 'chikkamagaluru', 'Chikkamagaluru', '2015-01-14'::date, 10),
  (533, 'chitradurga', 'Chitradurga', '2004-12-31'::date, 11),
  (534, 'dakshina-kannada', 'Dakshina Kannada', '2015-02-03'::date, 12),
  (535, 'davanagere', 'Davanagere', '2004-12-31'::date, 13),
  (536, 'dharwad', 'Dharwad', '2004-12-31'::date, 14),
  (537, 'gadag', 'Gadag', '2004-12-31'::date, 15),
  (539, 'hassan', 'Hassan', '2004-12-31'::date, 16),
  (540, 'haveri', 'Haveri', '2004-12-31'::date, 17),
  (538, 'kalaburagi', 'Kalaburagi', '2015-01-14'::date, 18),
  (541, 'kodagu', 'Kodagu', '2004-12-31'::date, 19),
  (542, 'kolar', 'Kolar', '2004-12-31'::date, 20),
  (543, 'koppal', 'Koppal', '2004-12-31'::date, 21),
  (544, 'mandya', 'Mandya', '2004-12-31'::date, 22),
  (545, 'mysuru', 'Mysuru', '2015-01-14'::date, 23),
  (546, 'raichur', 'Raichur', '2004-12-31'::date, 24),
  (547, 'shivamogga', 'Shivamogga', '2015-01-14'::date, 25),
  (548, 'tumakuru', 'Tumakuru', '2015-01-14'::date, 26),
  (549, 'udupi', 'Udupi', '2004-12-31'::date, 27),
  (550, 'uttara-kannada', 'Uttara Kannada', '2015-02-03'::date, 28),
  (738, 'vijayanagara', 'Vijayanagara', '2021-02-07'::date, 29),
  (530, 'vijayapura', 'Vijayapura', '2015-01-14'::date, 30),
  (635, 'yadgir', 'Yadgir', '2004-12-31'::date, 31)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 29
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Kerala — 14 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (554, 'alappuzha', 'Alappuzha', '2004-12-31'::date, 1),
  (555, 'ernakulam', 'Ernakulam', '2004-12-31'::date, 2),
  (556, 'idukki', 'Idukki', '2004-12-31'::date, 3),
  (557, 'kannur', 'Kannur', '2004-12-31'::date, 4),
  (558, 'kasaragod', 'Kasaragod', '2004-12-31'::date, 5),
  (559, 'kollam', 'Kollam', '2004-12-31'::date, 6),
  (560, 'kottayam', 'Kottayam', '2004-12-31'::date, 7),
  (561, 'kozhikode', 'Kozhikode', '2004-12-31'::date, 8),
  (562, 'malappuram', 'Malappuram', '2004-12-31'::date, 9),
  (563, 'palakkad', 'Palakkad', '2004-12-31'::date, 10),
  (564, 'pathanamthitta', 'Pathanamthitta', '2004-12-31'::date, 11),
  (565, 'thiruvananthapuram', 'Thiruvananthapuram', '2004-12-31'::date, 12),
  (566, 'thrissur', 'Thrissur', '2004-12-31'::date, 13),
  (567, 'wayanad', 'Wayanad', '2004-12-31'::date, 14)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 32
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Ladakh — 2 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (6, 'kargil', 'Kargil', '2019-08-23'::date, 1),
  (9, 'leh-ladakh', 'Leh Ladakh', '2019-08-23'::date, 2)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 37
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Lakshadweep — 1 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (553, 'lakshadweep-district', 'Lakshadweep District', '2004-12-31'::date, 1)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 31
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Madhya Pradesh — 55 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (667, 'agar-malwa', 'Agar-Malwa', '2023-10-04'::date, 1),
  (639, 'alirajpur', 'Alirajpur', '2004-12-31'::date, 2),
  (390, 'anuppur', 'Anuppur', '2004-12-31'::date, 3),
  (391, 'ashoknagar', 'Ashoknagar', '2004-12-31'::date, 4),
  (392, 'balaghat', 'Balaghat', '2004-12-31'::date, 5),
  (393, 'barwani', 'Barwani', '2004-12-31'::date, 6),
  (394, 'betul', 'Betul', '2004-12-31'::date, 7),
  (395, 'bhind', 'Bhind', '2004-12-31'::date, 8),
  (396, 'bhopal', 'Bhopal', '2004-12-31'::date, 9),
  (397, 'burhanpur', 'Burhanpur', '2004-12-31'::date, 10),
  (398, 'chhatarpur', 'Chhatarpur', '2004-12-31'::date, 11),
  (399, 'chhindwara', 'Chhindwara', '2023-10-23'::date, 12),
  (400, 'damoh', 'Damoh', '2004-12-31'::date, 13),
  (401, 'datia', 'Datia', '2004-12-31'::date, 14),
  (402, 'dewas', 'Dewas', '2004-12-31'::date, 15),
  (403, 'dhar', 'Dhar', '2004-12-31'::date, 16),
  (404, 'dindori', 'Dindori', '2004-12-31'::date, 17),
  (406, 'guna', 'Guna', '2004-12-31'::date, 18),
  (407, 'gwalior', 'Gwalior', '2004-12-31'::date, 19),
  (408, 'harda', 'Harda', '2004-12-31'::date, 20),
  (410, 'indore', 'Indore', '2004-12-31'::date, 21),
  (411, 'jabalpur', 'Jabalpur', '2004-12-31'::date, 22),
  (412, 'jhabua', 'Jhabua', '2004-12-31'::date, 23),
  (413, 'katni', 'Katni', '2004-12-31'::date, 24),
  (405, 'khandwa-east-nimar', 'Khandwa (East Nimar)', '2023-10-04'::date, 25),
  (414, 'khargone-west-nimar', 'Khargone (West Nimar)', '2023-10-04'::date, 26),
  (784, 'maihar', 'Maihar', '2023-10-04'::date, 27),
  (415, 'mandla', 'Mandla', '2004-12-31'::date, 28),
  (416, 'mandsaur', 'Mandsaur', '2004-12-31'::date, 29),
  (766, 'mauganj', 'MAUGANJ', '2023-08-12'::date, 30),
  (417, 'morena', 'Morena', '2004-12-31'::date, 31),
  (409, 'narmadapuram', 'Narmadapuram', '2022-02-06'::date, 32),
  (418, 'narsimhapur', 'Narsimhapur', '2023-10-04'::date, 33),
  (419, 'neemuch', 'Neemuch', '2004-12-31'::date, 34),
  (722, 'niwari', 'Niwari', '2018-09-28'::date, 35),
  (785, 'pandhurna', 'Pandhurna', '2023-10-04'::date, 36),
  (420, 'panna', 'Panna', '2004-12-31'::date, 37),
  (421, 'raisen', 'Raisen', '2004-12-31'::date, 38),
  (422, 'rajgarh', 'Rajgarh', '2004-12-31'::date, 39),
  (423, 'ratlam', 'Ratlam', '2004-12-31'::date, 40),
  (424, 'rewa', 'Rewa', '2023-08-14'::date, 41),
  (425, 'sagar', 'Sagar', '2004-12-31'::date, 42),
  (426, 'satna', 'Satna', '2023-10-23'::date, 43),
  (427, 'sehore', 'Sehore', '2004-12-31'::date, 44),
  (428, 'seoni', 'Seoni', '2004-12-31'::date, 45),
  (429, 'shahdol', 'Shahdol', '2004-12-31'::date, 46),
  (430, 'shajapur', 'Shajapur', '2014-12-29'::date, 47),
  (431, 'sheopur', 'Sheopur', '2004-12-31'::date, 48),
  (432, 'shivpuri', 'Shivpuri', '2004-12-31'::date, 49),
  (433, 'sidhi', 'Sidhi', '2004-12-31'::date, 50),
  (638, 'singrauli', 'Singrauli', '2004-12-31'::date, 51),
  (434, 'tikamgarh', 'Tikamgarh', '2019-03-22'::date, 52),
  (435, 'ujjain', 'Ujjain', '2004-12-31'::date, 53),
  (436, 'umaria', 'Umaria', '2004-12-31'::date, 54),
  (437, 'vidisha', 'Vidisha', '2004-12-31'::date, 55)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 23
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Maharashtra — 36 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (466, 'ahilyanagar', 'Ahilyanagar', '2024-10-03'::date, 1),
  (467, 'akola', 'Akola', '2004-12-31'::date, 2),
  (468, 'amravati', 'Amravati', '2004-12-31'::date, 3),
  (470, 'beed', 'Beed', '2004-12-31'::date, 4),
  (471, 'bhandara', 'Bhandara', '2004-12-31'::date, 5),
  (472, 'buldhana', 'Buldhana', '2004-12-31'::date, 6),
  (473, 'chandrapur', 'Chandrapur', '2004-12-31'::date, 7),
  (469, 'chhatrapati-sambhajinagar', 'Chhatrapati Sambhajinagar', '2023-09-14'::date, 8),
  (488, 'dharashiv', 'Dharashiv', '2023-09-14'::date, 9),
  (474, 'dhule', 'Dhule', '2004-12-31'::date, 10),
  (475, 'gadchiroli', 'Gadchiroli', '2004-12-31'::date, 11),
  (476, 'gondia', 'Gondia', '2004-12-31'::date, 12),
  (477, 'hingoli', 'Hingoli', '2004-12-31'::date, 13),
  (478, 'jalgaon', 'Jalgaon', '2013-07-09'::date, 14),
  (479, 'jalna', 'Jalna', '2004-12-31'::date, 15),
  (480, 'kolhapur', 'Kolhapur', '2004-12-31'::date, 16),
  (481, 'latur', 'Latur', '2004-12-31'::date, 17),
  (482, 'mumbai', 'Mumbai', '2004-12-31'::date, 18),
  (483, 'mumbai-suburban', 'Mumbai Suburban', '2004-12-31'::date, 19),
  (484, 'nagpur', 'Nagpur', '2004-12-31'::date, 20),
  (485, 'nanded', 'Nanded', '2004-12-31'::date, 21),
  (486, 'nandurbar', 'Nandurbar', '2004-12-31'::date, 22),
  (487, 'nashik', 'Nashik', '2004-12-31'::date, 23),
  (665, 'palghar', 'Palghar', '2014-08-12'::date, 24),
  (489, 'parbhani', 'Parbhani', '2004-12-31'::date, 25),
  (490, 'pune', 'Pune', '2004-12-31'::date, 26),
  (491, 'raigad', 'Raigad', '2004-12-31'::date, 27),
  (492, 'ratnagiri', 'Ratnagiri', '2004-12-31'::date, 28),
  (493, 'sangli', 'Sangli', '2004-12-31'::date, 29),
  (494, 'satara', 'Satara', '2004-12-31'::date, 30),
  (495, 'sindhudurg', 'Sindhudurg', '2004-12-31'::date, 31),
  (496, 'solapur', 'Solapur', '2004-12-31'::date, 32),
  (497, 'thane', 'Thane', '2014-08-12'::date, 33),
  (498, 'wardha', 'Wardha', '2004-12-31'::date, 34),
  (499, 'washim', 'Washim', '2004-12-31'::date, 35),
  (500, 'yavatmal', 'Yavatmal', '2004-12-31'::date, 36)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 27
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Manipur — 16 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (252, 'bishnupur', 'Bishnupur', '2004-12-31'::date, 1),
  (253, 'chandel', 'Chandel', '2018-02-27'::date, 2),
  (254, 'churachandpur', 'Churachandpur', '2018-02-27'::date, 3),
  (255, 'imphal-east', 'Imphal East', '2018-02-27'::date, 4),
  (256, 'imphal-west', 'Imphal West', '2004-12-31'::date, 5),
  (713, 'jiribam', 'Jiribam', '2016-12-07'::date, 6),
  (711, 'kakching', 'Kakching', '2016-12-07'::date, 7),
  (717, 'kamjong', 'Kamjong', '2016-12-07'::date, 8),
  (712, 'kangpokpi', 'Kangpokpi', '2016-12-07'::date, 9),
  (714, 'noney', 'Noney', '2016-12-07'::date, 10),
  (715, 'pherzawl', 'Pherzawl', '2016-12-07'::date, 11),
  (257, 'senapati', 'Senapati', '2018-02-26'::date, 12),
  (258, 'tamenglong', 'Tamenglong', '2018-02-27'::date, 13),
  (716, 'tengnoupal', 'Tengnoupal', '2016-12-07'::date, 14),
  (259, 'thoubal', 'Thoubal', '2018-02-26'::date, 15),
  (260, 'ukhrul', 'Ukhrul', '2018-02-27'::date, 16)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 14
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Meghalaya — 12 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (273, 'east-garo-hills', 'East Garo Hills', '2013-07-31'::date, 1),
  (657, 'east-jaintia-hills', 'East Jaintia Hills', '2013-07-31'::date, 2),
  (274, 'east-khasi-hills', 'East Khasi Hills', '2004-12-31'::date, 3),
  (740, 'eastern-west-khasi-hills', 'Eastern West Khasi Hills', '2021-11-08'::date, 4),
  (656, 'north-garo-hills', 'North Garo Hills', '2013-07-31'::date, 5),
  (276, 'ri-bhoi', 'Ri Bhoi', '2004-12-31'::date, 6),
  (277, 'south-garo-hills', 'South Garo Hills', '2004-12-31'::date, 7),
  (663, 'south-west-garo-hills', 'South West Garo Hills', '2014-05-07'::date, 8),
  (658, 'south-west-khasi-hills', 'South West Khasi Hills', '2013-07-31'::date, 9),
  (278, 'west-garo-hills', 'West Garo Hills', '2014-05-07'::date, 10),
  (275, 'west-jaintia-hills', 'West Jaintia Hills', '2013-07-31'::date, 11),
  (279, 'west-khasi-hills', 'West Khasi Hills', '2022-02-24'::date, 12)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 17
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Mizoram — 11 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (261, 'aizawl', 'Aizawl', '2019-12-21'::date, 1),
  (262, 'champhai', 'Champhai', '2019-12-21'::date, 2),
  (726, 'hnahthial', 'Hnahthial', '2019-08-08'::date, 3),
  (728, 'khawzawl', 'Khawzawl', '2019-08-08'::date, 4),
  (263, 'kolasib', 'Kolasib', '2004-12-31'::date, 5),
  (264, 'lawngtlai', 'Lawngtlai', '2004-12-31'::date, 6),
  (265, 'lunglei', 'Lunglei', '2019-12-21'::date, 7),
  (266, 'mamit', 'Mamit', '2004-12-31'::date, 8),
  (727, 'saitual', 'Saitual', '2019-08-08'::date, 9),
  (268, 'serchhip', 'Serchhip', '2004-12-31'::date, 10),
  (267, 'siaha', 'Siaha', '2015-08-02'::date, 11)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 15
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Nagaland — 17 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (758, 'chumoukedima', 'Chumoukedima', '2021-12-19'::date, 1),
  (244, 'dimapur', 'Dimapur', '2022-12-21'::date, 2),
  (614, 'kiphire', 'Kiphire', '2023-03-20'::date, 3),
  (245, 'kohima', 'Kohima', '2022-07-29'::date, 4),
  (615, 'longleng', 'Longleng', '2004-12-31'::date, 5),
  (788, 'meluri', 'Meluri', '2024-11-01'::date, 6),
  (246, 'mokokchung', 'Mokokchung', '2004-12-31'::date, 7),
  (247, 'mon', 'Mon', '2004-12-31'::date, 8),
  (764, 'niuland', 'Niuland', '2021-12-19'::date, 9),
  (736, 'noklak', 'Noklak', '2020-08-05'::date, 10),
  (613, 'peren', 'Peren', '2004-12-31'::date, 11),
  (248, 'phek', 'Phek', '2025-04-24'::date, 12),
  (765, 'shamator', 'Shamator', '2022-01-19'::date, 13),
  (757, 'tseminyu', 'Tseminyu', '2021-12-20'::date, 14),
  (249, 'tuensang', 'Tuensang', '2023-03-20'::date, 15),
  (250, 'wokha', 'Wokha', '2004-12-31'::date, 16),
  (251, 'zunheboto', 'Zunheboto', '2004-12-31'::date, 17)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 13
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Odisha — 30 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (344, 'anugola', 'Anugola', '2026-06-21'::date, 1),
  (345, 'balangir', 'Balangir', '2004-12-31'::date, 2),
  (346, 'balasore', 'Balasore', '2022-02-03'::date, 3),
  (347, 'bargarh', 'Bargarh', '2004-12-31'::date, 4),
  (348, 'bhadrak', 'Bhadrak', '2004-12-31'::date, 5),
  (349, 'boudh', 'Boudh', '2004-12-31'::date, 6),
  (351, 'deogarh', 'Deogarh', '2004-12-31'::date, 7),
  (352, 'dhenkanal', 'Dhenkanal', '2004-12-31'::date, 8),
  (353, 'gajapati', 'Gajapati', '2004-12-31'::date, 9),
  (354, 'ganjam', 'Ganjam', '2004-12-31'::date, 10),
  (355, 'jagatsinghapur', 'Jagatsinghapur', '2004-12-31'::date, 11),
  (356, 'jajpur', 'Jajpur', '2004-12-31'::date, 12),
  (357, 'jharsuguda', 'Jharsuguda', '2004-12-31'::date, 13),
  (358, 'kalahandi', 'Kalahandi', '2004-12-31'::date, 14),
  (359, 'kandhamal', 'Kandhamal', '2004-12-31'::date, 15),
  (350, 'kataka', 'Kataka', '2026-06-21'::date, 16),
  (360, 'kendrapada', 'Kendrapada', '2026-06-21'::date, 17),
  (361, 'kendujhar', 'Kendujhar', '2026-06-21'::date, 18),
  (362, 'khordha', 'Khordha', '2004-12-31'::date, 19),
  (363, 'koraput', 'Koraput', '2004-12-31'::date, 20),
  (364, 'malkangiri', 'Malkangiri', '2004-12-31'::date, 21),
  (365, 'mayurbhanj', 'Mayurbhanj', '2004-12-31'::date, 22),
  (366, 'nabarangpur', 'Nabarangpur', '2004-12-31'::date, 23),
  (367, 'nayagarh', 'Nayagarh', '2004-12-31'::date, 24),
  (368, 'nuapada', 'Nuapada', '2004-12-31'::date, 25),
  (369, 'puri', 'Puri', '2004-12-31'::date, 26),
  (370, 'rayagada', 'Rayagada', '2004-12-31'::date, 27),
  (371, 'sambalpur', 'Sambalpur', '2004-12-31'::date, 28),
  (372, 'sonepur', 'Sonepur', '2004-12-31'::date, 29),
  (373, 'sundaragada', 'Sundaragada', '2026-06-21'::date, 30)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 21
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Puducherry — 2 districts
-- LGD's district service returns only Karaikal and Puducherry. The UT's
-- other two districts, Mahe and Yanam — exclaves inside Kerala and Andhra
-- Pradesh — are absent from it, and are therefore absent here.
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (598, 'karaikal', 'Karaikal', '2004-12-31'::date, 1),
  (600, 'puducherry', 'Puducherry', '2004-12-31'::date, 2)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 34
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Punjab — 23 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (27, 'amritsar', 'Amritsar', '2004-12-31'::date, 1),
  (605, 'barnala', 'Barnala', '2004-12-31'::date, 2),
  (28, 'bathinda', 'Bathinda', '2004-12-31'::date, 3),
  (29, 'faridkot', 'Faridkot', '2004-12-31'::date, 4),
  (30, 'fatehgarh-sahib', 'Fatehgarh Sahib', '2004-12-31'::date, 5),
  (651, 'fazilka', 'Fazilka', '2004-12-31'::date, 6),
  (31, 'ferozepur', 'Ferozepur', '2021-06-13'::date, 7),
  (32, 'gurdaspur', 'Gurdaspur', '2014-02-03'::date, 8),
  (33, 'hoshiarpur', 'Hoshiarpur', '2004-12-31'::date, 9),
  (34, 'jalandhar', 'Jalandhar', '2004-12-31'::date, 10),
  (35, 'kapurthala', 'Kapurthala', '2004-12-31'::date, 11),
  (36, 'ludhiana', 'Ludhiana', '2013-06-18'::date, 12),
  (737, 'malerkotla', 'Malerkotla', '2021-06-17'::date, 13),
  (37, 'mansa', 'Mansa', '2013-06-07'::date, 14),
  (38, 'moga', 'Moga', '2004-12-31'::date, 15),
  (662, 'pathankot', 'Pathankot', '2014-02-03'::date, 16),
  (41, 'patiala', 'Patiala', '2004-12-31'::date, 17),
  (42, 'rupnagar', 'Rupnagar', '2004-12-31'::date, 18),
  (608, 's-a-s-nagar', 'S.A.S Nagar', '2004-12-31'::date, 19),
  (43, 'sangrur', 'Sangrur', '2021-06-28'::date, 20),
  (40, 'shahid-bhagat-singh-nagar', 'Shahid Bhagat Singh Nagar', '2008-09-28'::date, 21),
  (39, 'sri-muktsar-sahib', 'Sri Muktsar Sahib', '2015-03-16'::date, 22),
  (609, 'tarn-taran', 'Tarn Taran', '2013-06-10'::date, 23)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 3
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Rajasthan — 41 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (86, 'ajmer', 'Ajmer', '2023-10-06'::date, 1),
  (87, 'alwar', 'Alwar', '2023-10-06'::date, 2),
  (775, 'balotra', 'Balotra', '2023-08-04'::date, 3),
  (88, 'banswara', 'Banswara', '2004-12-31'::date, 4),
  (89, 'baran', 'Baran', '2004-12-31'::date, 5),
  (90, 'barmer', 'Barmer', '2023-09-29'::date, 6),
  (774, 'beawar', 'Beawar', '2023-08-04'::date, 7),
  (91, 'bharatpur', 'Bharatpur', '2023-09-27'::date, 8),
  (92, 'bhilwara', 'Bhilwara', '2023-10-06'::date, 9),
  (93, 'bikaner', 'Bikaner', '2023-09-29'::date, 10),
  (94, 'bundi', 'Bundi', '2004-12-31'::date, 11),
  (95, 'chittorgarh', 'Chittorgarh', '2004-12-31'::date, 12),
  (96, 'churu', 'Churu', '2004-12-31'::date, 13),
  (97, 'dausa', 'Dausa', '2004-12-31'::date, 14),
  (767, 'deeg', 'Deeg', '2023-08-04'::date, 15),
  (98, 'dholpur', 'Dholpur', '2004-12-31'::date, 16),
  (768, 'didwana-kuchaman', 'Didwana-Kuchaman', '2023-08-04'::date, 17),
  (99, 'dungarpur', 'Dungarpur', '2004-12-31'::date, 18),
  (100, 'ganganagar', 'Ganganagar', '2023-09-29'::date, 19),
  (101, 'hanumangarh', 'Hanumangarh', '2004-12-31'::date, 20),
  (102, 'jaipur', 'Jaipur', '2023-10-10'::date, 21),
  (103, 'jaisalmer', 'Jaisalmer', '2004-12-31'::date, 22),
  (104, 'jalore', 'Jalore', '2023-10-06'::date, 23),
  (105, 'jhalawar', 'Jhalawar', '2004-12-31'::date, 24),
  (106, 'jhunjhunu', 'Jhunjhunu', '2023-09-29'::date, 25),
  (107, 'jodhpur', 'Jodhpur', '2023-10-06'::date, 26),
  (108, 'karauli', 'Karauli', '2023-09-29'::date, 27),
  (770, 'khairthal-tijara', 'Khairthal-Tijara', '2023-08-04'::date, 28),
  (109, 'kota', 'Kota', '2004-12-31'::date, 29),
  (782, 'kotputli-behror', 'Kotputli-Behror', '2023-08-06'::date, 30),
  (110, 'nagaur', 'Nagaur', '2023-09-29'::date, 31),
  (111, 'pali', 'Pali', '2023-09-29'::date, 32),
  (772, 'phalodi', 'Phalodi', '2023-08-04'::date, 33),
  (629, 'pratapgarh', 'Pratapgarh', '2004-12-31'::date, 34),
  (112, 'rajsamand', 'Rajsamand', '2004-12-31'::date, 35),
  (777, 'salumbar', 'Salumbar', '2023-08-04'::date, 36),
  (113, 'sawai-madhopur', 'Sawai Madhopur', '2023-09-29'::date, 37),
  (114, 'sikar', 'Sikar', '2023-09-29'::date, 38),
  (115, 'sirohi', 'Sirohi', '2004-12-31'::date, 39),
  (116, 'tonk', 'Tonk', '2023-10-06'::date, 40),
  (117, 'udaipur', 'Udaipur', '2023-09-29'::date, 41)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 8
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Sikkim — 6 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (225, 'gangtok', 'Gangtok', '2022-03-07'::date, 1),
  (228, 'gyalshing', 'Gyalshing', '2022-03-08'::date, 2),
  (226, 'mangan', 'Mangan', '2021-12-19'::date, 3),
  (227, 'namchi', 'Namchi', '2021-12-19'::date, 4),
  (741, 'pakyong', 'Pakyong', '2021-12-19'::date, 5),
  (742, 'soreng', 'Soreng', '2021-12-19'::date, 6)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 11
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Tamil Nadu — 38 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (610, 'ariyalur', 'Ariyalur', '2004-12-31'::date, 1),
  (730, 'chengalpattu', 'Chengalpattu', '2019-11-28'::date, 2),
  (568, 'chennai', 'Chennai', '2004-12-31'::date, 3),
  (569, 'coimbatore', 'Coimbatore', '2004-12-31'::date, 4),
  (570, 'cuddalore', 'Cuddalore', '2004-12-31'::date, 5),
  (571, 'dharmapuri', 'Dharmapuri', '2004-12-31'::date, 6),
  (572, 'dindigul', 'Dindigul', '2004-12-31'::date, 7),
  (573, 'erode', 'Erode', '2004-12-31'::date, 8),
  (729, 'kallakurichi', 'Kallakurichi', '2019-11-11'::date, 9),
  (574, 'kancheepuram', 'Kancheepuram', '2020-03-28'::date, 10),
  (575, 'kanniyakumari', 'Kanniyakumari', '2004-12-31'::date, 11),
  (576, 'karur', 'Karur', '2004-12-31'::date, 12),
  (577, 'krishnagiri', 'Krishnagiri', '2004-12-31'::date, 13),
  (578, 'madurai', 'Madurai', '2004-12-31'::date, 14),
  (735, 'mayiladuthurai', 'Mayiladuthurai', '2020-12-27'::date, 15),
  (579, 'nagapattinam', 'Nagapattinam', '2021-02-17'::date, 16),
  (580, 'namakkal', 'Namakkal', '2004-12-31'::date, 17),
  (587, 'nilgiris', 'Nilgiris', '2004-12-31'::date, 18),
  (581, 'perambalur', 'Perambalur', '2004-12-31'::date, 19),
  (582, 'pudukkottai', 'Pudukkottai', '2004-12-31'::date, 20),
  (583, 'ramanathapuram', 'Ramanathapuram', '2004-12-31'::date, 21),
  (731, 'ranipet', 'Ranipet', '2019-11-11'::date, 22),
  (584, 'salem', 'Salem', '2004-12-31'::date, 23),
  (585, 'sivaganga', 'Sivaganga', '2004-12-31'::date, 24),
  (733, 'tenkasi', 'Tenkasi', '2019-11-11'::date, 25),
  (586, 'thanjavur', 'Thanjavur', '2004-12-31'::date, 26),
  (588, 'theni', 'Theni', '2004-12-31'::date, 27),
  (589, 'thiruvallur', 'Thiruvallur', '2004-12-31'::date, 28),
  (590, 'thiruvarur', 'Thiruvarur', '2004-12-31'::date, 29),
  (594, 'thoothukkudi', 'Thoothukkudi', '2004-12-31'::date, 30),
  (591, 'tiruchirappalli', 'Tiruchirappalli', '2004-12-31'::date, 31),
  (592, 'tirunelveli', 'Tirunelveli', '2019-11-12'::date, 32),
  (732, 'tirupathur', 'Tirupathur', '2019-11-11'::date, 33),
  (634, 'tiruppur', 'Tiruppur', '2004-12-31'::date, 34),
  (593, 'tiruvannamalai', 'Tiruvannamalai', '2004-12-31'::date, 35),
  (595, 'vellore', 'Vellore', '2020-04-03'::date, 36),
  (596, 'viluppuram', 'Viluppuram', '2020-03-19'::date, 37),
  (597, 'virudhunagar', 'Virudhunagar', '2004-12-31'::date, 38)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 33
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Telangana — 33 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (501, 'adilabad', 'Adilabad', '2016-11-16'::date, 1),
  (690, 'bhadradri-kothagudem', 'Bhadradri Kothagudem', '2017-01-23'::date, 2),
  (686, 'hanumakonda', 'Hanumakonda', '2021-08-11'::date, 3),
  (507, 'hyderabad', 'Hyderabad', '2014-06-16'::date, 4),
  (681, 'jagitial', 'Jagitial', '2016-10-10'::date, 5),
  (689, 'jangoan', 'Jangoan', '2016-10-10'::date, 6),
  (687, 'jayashankar-bhupalapally', 'Jayashankar Bhupalapally', '2019-02-19'::date, 7),
  (695, 'jogulamba-gadwal', 'Jogulamba Gadwal', '2017-01-23'::date, 8),
  (685, 'kamareddy', 'Kamareddy', '2016-10-10'::date, 9),
  (508, 'karimnagar', 'Karimnagar', '2016-10-11'::date, 10),
  (509, 'khammam', 'Khammam', '2016-10-11'::date, 11),
  (699, 'kumuram-bheem-asifabad', 'Kumuram Bheem Asifabad', '2017-01-23'::date, 12),
  (688, 'mahabubabad', 'Mahabubabad', '2016-10-10'::date, 13),
  (512, 'mahabubnagar', 'Mahabubnagar', '2019-02-19'::date, 14),
  (684, 'mancherial', 'Mancherial', '2016-10-10'::date, 15),
  (513, 'medak', 'Medak', '2016-10-11'::date, 16),
  (700, 'medchal-malkajgiri', 'Medchal Malkajgiri', '2016-10-10'::date, 17),
  (720, 'mulugu', 'Mulugu', '2019-02-16'::date, 18),
  (694, 'nagarkurnool', 'Nagarkurnool', '2016-10-10'::date, 19),
  (514, 'nalgonda', 'Nalgonda', '2016-11-16'::date, 20),
  (721, 'narayanpet', 'Narayanpet', '2019-02-16'::date, 21),
  (680, 'nirmal', 'Nirmal', '2016-10-10'::date, 22),
  (516, 'nizamabad', 'Nizamabad', '2016-10-11'::date, 23),
  (682, 'peddapalli', 'Peddapalli', '2016-10-10'::date, 24),
  (683, 'rajanna-sircilla', 'Rajanna Sircilla', '2017-01-23'::date, 25),
  (518, 'ranga-reddy', 'Ranga Reddy', '2016-11-16'::date, 26),
  (691, 'sangareddy', 'Sangareddy', '2016-10-10'::date, 27),
  (692, 'siddipet', 'Siddipet', '2016-10-10'::date, 28),
  (696, 'suryapet', 'Suryapet', '2016-10-10'::date, 29),
  (698, 'vikarabad', 'Vikarabad', '2016-10-10'::date, 30),
  (693, 'wanaparthy', 'Wanaparthy', '2016-10-10'::date, 31),
  (522, 'warangal', 'Warangal', '2021-08-11'::date, 32),
  (697, 'yadadri-bhuvanagiri', 'Yadadri Bhuvanagiri', '2017-07-23'::date, 33)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 36
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Tripura — 8 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (269, 'dhalai', 'Dhalai', '2004-12-31'::date, 1),
  (654, 'gomati', 'Gomati', '2004-12-31'::date, 2),
  (652, 'khowai', 'Khowai', '2004-12-31'::date, 3),
  (270, 'north-tripura', 'North Tripura', '2004-12-31'::date, 4),
  (653, 'sepahijala', 'Sepahijala', '2004-12-31'::date, 5),
  (271, 'south-tripura', 'South Tripura', '2004-12-31'::date, 6),
  (655, 'unakoti', 'Unakoti', '2004-12-31'::date, 7),
  (272, 'west-tripura', 'West Tripura', '2004-12-31'::date, 8)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 16
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Uttar Pradesh — 75 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (118, 'agra', 'Agra', '2004-12-31'::date, 1),
  (119, 'aligarh', 'Aligarh', '2004-12-31'::date, 2),
  (121, 'ambedkar-nagar', 'Ambedkar Nagar', '2004-12-31'::date, 3),
  (640, 'amethi', 'Amethi', '2013-12-10'::date, 4),
  (154, 'amroha', 'Amroha', '2014-01-21'::date, 5),
  (122, 'auraiya', 'Auraiya', '2004-12-31'::date, 6),
  (140, 'ayodhya', 'Ayodhya', '2018-11-22'::date, 7),
  (123, 'azamgarh', 'Azamgarh', '2004-12-31'::date, 8),
  (124, 'baghpat', 'Baghpat', '2004-12-31'::date, 9),
  (125, 'bahraich', 'Bahraich', '2004-12-31'::date, 10),
  (126, 'ballia', 'Ballia', '2004-12-31'::date, 11),
  (127, 'balrampur', 'Balrampur', '2004-12-31'::date, 12),
  (128, 'banda', 'Banda', '2004-12-31'::date, 13),
  (129, 'bara-banki', 'Bara Banki', '2004-12-31'::date, 14),
  (130, 'bareilly', 'Bareilly', '2004-12-31'::date, 15),
  (131, 'basti', 'Basti', '2004-12-31'::date, 16),
  (179, 'bhadohi', 'Bhadohi', '2015-09-07'::date, 17),
  (132, 'bijnor', 'Bijnor', '2004-12-31'::date, 18),
  (133, 'budaun', 'Budaun', '2013-11-13'::date, 19),
  (134, 'bulandshahr', 'Bulandshahr', '2004-12-31'::date, 20),
  (135, 'chandauli', 'Chandauli', '2004-12-31'::date, 21),
  (136, 'chitrakoot', 'Chitrakoot', '2004-12-31'::date, 22),
  (137, 'deoria', 'Deoria', '2004-12-31'::date, 23),
  (138, 'etah', 'Etah', '2004-12-31'::date, 24),
  (139, 'etawah', 'Etawah', '2004-12-31'::date, 25),
  (141, 'farrukhabad', 'Farrukhabad', '2004-12-31'::date, 26),
  (142, 'fatehpur', 'Fatehpur', '2004-12-31'::date, 27),
  (143, 'firozabad', 'Firozabad', '2004-12-31'::date, 28),
  (144, 'gautam-buddha-nagar', 'Gautam Buddha Nagar', '2004-12-31'::date, 29),
  (145, 'ghaziabad', 'Ghaziabad', '2013-12-09'::date, 30),
  (146, 'ghazipur', 'Ghazipur', '2004-12-31'::date, 31),
  (147, 'gonda', 'Gonda', '2004-12-31'::date, 32),
  (148, 'gorakhpur', 'Gorakhpur', '2004-12-31'::date, 33),
  (149, 'hamirpur', 'Hamirpur', '2004-12-31'::date, 34),
  (661, 'hapur', 'Hapur', '2014-01-21'::date, 35),
  (150, 'hardoi', 'Hardoi', '2004-12-31'::date, 36),
  (163, 'hathras', 'Hathras', '2014-01-21'::date, 37),
  (151, 'jalaun', 'Jalaun', '2004-12-31'::date, 38),
  (152, 'jaunpur', 'Jaunpur', '2004-12-31'::date, 39),
  (153, 'jhansi', 'Jhansi', '2004-12-31'::date, 40),
  (155, 'kannauj', 'Kannauj', '2004-12-31'::date, 41),
  (156, 'kanpur-dehat', 'Kanpur Dehat', '2004-12-31'::date, 42),
  (157, 'kanpur-nagar', 'Kanpur Nagar', '2004-12-31'::date, 43),
  (633, 'kasganj', 'Kasganj', '2013-12-09'::date, 44),
  (158, 'kaushambi', 'Kaushambi', '2004-12-31'::date, 45),
  (159, 'kheri', 'Kheri', '2004-12-31'::date, 46),
  (160, 'kushinagar', 'Kushinagar', '2004-12-31'::date, 47),
  (161, 'lalitpur', 'Lalitpur', '2004-12-31'::date, 48),
  (162, 'lucknow', 'Lucknow', '2004-12-31'::date, 49),
  (165, 'mahoba', 'Mahoba', '2004-12-31'::date, 50),
  (164, 'mahrajganj', 'Mahrajganj', '2004-12-31'::date, 51),
  (166, 'mainpuri', 'Mainpuri', '2004-12-31'::date, 52),
  (167, 'mathura', 'Mathura', '2004-12-31'::date, 53),
  (168, 'mau', 'Mau', '2004-12-31'::date, 54),
  (169, 'meerut', 'Meerut', '2004-12-31'::date, 55),
  (170, 'mirzapur', 'Mirzapur', '2004-12-31'::date, 56),
  (171, 'moradabad', 'Moradabad', '2013-11-13'::date, 57),
  (172, 'muzaffarnagar', 'Muzaffarnagar', '2013-11-19'::date, 58),
  (173, 'pilibhit', 'Pilibhit', '2004-12-31'::date, 59),
  (174, 'pratapgarh', 'Pratapgarh', '2004-12-31'::date, 60),
  (120, 'prayagraj', 'Prayagraj', '2018-10-17'::date, 61),
  (175, 'rae-bareli', 'Rae Bareli', '2004-12-31'::date, 62),
  (176, 'rampur', 'Rampur', '2004-12-31'::date, 63),
  (177, 'saharanpur', 'Saharanpur', '2004-12-31'::date, 64),
  (659, 'sambhal', 'Sambhal', '2013-11-19'::date, 65),
  (178, 'sant-kabir-nagar', 'Sant Kabir Nagar', '2004-12-31'::date, 66),
  (180, 'shahjahanpur', 'Shahjahanpur', '2004-12-31'::date, 67),
  (660, 'shamli', 'Shamli', '2013-11-19'::date, 68),
  (181, 'shrawasti', 'Shrawasti', '2004-12-31'::date, 69),
  (182, 'siddharthnagar', 'Siddharthnagar', '2004-12-31'::date, 70),
  (183, 'sitapur', 'Sitapur', '2004-12-31'::date, 71),
  (184, 'sonbhadra', 'Sonbhadra', '2004-12-31'::date, 72),
  (185, 'sultanpur', 'Sultanpur', '2004-12-31'::date, 73),
  (186, 'unnao', 'Unnao', '2004-12-31'::date, 74),
  (187, 'varanasi', 'Varanasi', '2004-12-31'::date, 75)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 9
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- Uttarakhand — 13 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (45, 'almora', 'Almora', '2004-12-31'::date, 1),
  (46, 'bageshwar', 'Bageshwar', '2004-12-31'::date, 2),
  (47, 'chamoli', 'Chamoli', '2004-12-31'::date, 3),
  (48, 'champawat', 'Champawat', '2004-12-31'::date, 4),
  (49, 'dehradun', 'Dehradun', '2004-12-31'::date, 5),
  (50, 'haridwar', 'Haridwar', '2004-12-31'::date, 6),
  (51, 'nainital', 'Nainital', '2004-12-31'::date, 7),
  (52, 'pauri-garhwal', 'Pauri Garhwal', '2004-12-31'::date, 8),
  (53, 'pithoragarh', 'Pithoragarh', '2004-12-31'::date, 9),
  (54, 'rudraprayag', 'Rudraprayag', '2008-09-17'::date, 10),
  (55, 'tehri-garhwal', 'Tehri Garhwal', '2004-12-31'::date, 11),
  (56, 'udham-singh-nagar', 'Udham Singh Nagar', '2004-12-31'::date, 12),
  (57, 'uttarkashi', 'Uttarkashi', '2004-12-31'::date, 13)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 5
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

-- West Bengal — 23 districts
INSERT INTO districts
  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)
SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord
FROM states s, (VALUES
  (664, 'alipurduar', 'Alipurduar', '2014-07-01'::date, 1),
  (305, 'bankura', 'Bankura', '2004-12-31'::date, 2),
  (307, 'birbhum', 'Birbhum', '2004-12-31'::date, 3),
  (308, 'cooch-behar', 'Cooch Behar', '2019-07-10'::date, 4),
  (310, 'dakshin-dinajpur', 'Dakshin Dinajpur', '2019-07-10'::date, 5),
  (309, 'darjeeling', 'Darjeeling', '2017-04-03'::date, 6),
  (312, 'hooghly', 'Hooghly', '2004-12-31'::date, 7),
  (313, 'howrah', 'Howrah', '2004-12-31'::date, 8),
  (314, 'jalpaiguri', 'Jalpaiguri', '2014-07-01'::date, 9),
  (703, 'jhargram', 'Jhargram', '2017-05-05'::date, 10),
  (702, 'kalimpong', 'Kalimpong', '2017-02-06'::date, 11),
  (315, 'kolkata', 'Kolkata', '2004-12-31'::date, 12),
  (316, 'malda', 'Malda', '2019-07-10'::date, 13),
  (319, 'murshidabad', 'Murshidabad', '2004-12-31'::date, 14),
  (320, 'nadia', 'Nadia', '2004-12-31'::date, 15),
  (303, 'north-24-parganas', 'North 24 Parganas', '2019-07-10'::date, 16),
  (704, 'paschim-bardhaman', 'Paschim Bardhaman', '2017-04-20'::date, 17),
  (318, 'paschim-medinipur', 'Paschim Medinipur', '2019-07-10'::date, 18),
  (306, 'purba-bardhaman', 'Purba Bardhaman', '2017-05-05'::date, 19),
  (317, 'purba-medinipur', 'Purba Medinipur', '2019-07-10'::date, 20),
  (321, 'purulia', 'Purulia', '2004-12-31'::date, 21),
  (304, 'south-24-parganas', 'South 24 Parganas', '2019-07-10'::date, 22),
  (311, 'uttar-dinajpur', 'Uttar Dinajpur', '2019-07-10'::date, 23)
) AS v(lgd_code, slug, name, effective_from, ord)
WHERE s.lgd_code = 19
ON CONFLICT (lgd_code) DO UPDATE SET
  state_id       = EXCLUDED.state_id,
  slug           = EXCLUDED.slug,
  name           = EXCLUDED.name,
  effective_from = EXCLUDED.effective_from,
  display_order  = EXCLUDED.display_order;

COMMIT;
