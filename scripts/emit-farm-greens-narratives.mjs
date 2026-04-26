#!/usr/bin/env node
/**
 * Rebuilds data/farm-greens.narratives.json — long PDP copy (plain + ## headings → Lexical in seed),
 * only fields that add value (no default dimensions/weight/compare unless you add them per slug).
 *
 *   node scripts/emit-farm-greens-narratives.mjs
 *   (Invoked automatically from `yarn seed:farm-greens` preflight unless FARM_GREENS_SKIP_EMIT / FARM_GREENS_SKIP_PREFLIGHT is set.)
 */
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '..', 'data', 'farm-greens.narratives.json')

const d = (en, bn) => ({ en, bn })

/** Shared “deep” block appended to every product (English). Rich-text-friendly: one heading per line, blank line between blocks. */
const COMMON_EN = `## How Farm Greens lists this line

We describe physical reality first: you are buying a **1 kg net** line unless a pack shot clearly shows a pre-banded bunch or cluster. Net weight is what the scale commits to; piece count in the gallery is illustrative. If your operation needs a **fixed count** (e.g. 12 kiwi) instead of net kg, add that as a storefront policy—Farm Greens data stays weight-first so Dhaka home cooks and cloud kitchens can compare like-for-like on BDT per kg.

## Last-mile, Gulshan 1 and Mirpur 10

Our catalogue fiction is simple: there are two public dispatch / pick-up points—**Gulshan 1** and **Mirpur 10**—with mapped **green vs gray** localities and shipping tiers in the same manifest family. The PDP you are reading is seeded with that geography so QA can trace **which hub** a line is most often staged from, even if your storefront later abstracts “Dhaka” for buyers. That matters for **time-to-door** in heat and rain, not for pretending single-origin on every line.

## Gallery photos vs cut quality

The seed attaches **several stills** in order. The **first** still becomes the **SEO / Open Graph** image in Payload when the seed runs (unless you override in Admin). We avoid heavy beauty retouch: minor shadow and colour balance only. If a lot arrives with a different silhouette than a hero still (e.g. more oval fruit), the weight line still governs. Return policies are your storefront’s—Farm Greens only guarantees that the line matches **grade rules** in this document at pack-out.

## BDT, compare-at, and what you see in Admin

Narrative JSON does **not** have to restate your selling price. **Base price in BDT** still lives in the main manifest. Optional **compare-at** and **cost** are omitted here unless you add them for a few hero SKUs—your Admin remains the source of truth. When compare-at is absent, the seed leaves **no fake MSRP**; sale badges follow your product **sale display mode** in Payload.

## Storage in Dhaka weather (practical)

Humidity and load-shedding affect every fresh line. For **vegetable** lots: rinse only what you will cook soon; spin or towel dry, then a **breathable bag** in the coldest part of the fridge, not a sealed plastic sweatbox. For **fruit**: stage ripening on the counter for fruit that needs it, then chill only when you are slowing **over-ripening**. For **aromatics and herbs**: treat like cut flowers for the first 24h—no standing water on leaves unless the recipe demands it. When in doubt, **smell the cut** before a big batch: off-odour is a no-go in professional kitchens and at home.

## Allergen-style notes (non-medical)

These lines move through a general produce environment. We do not label every shared facility; if a buyer is **anaphylactic**, your storefront should surface your own **allergen matrix**. Farm Greens copy is **culinary and logistic**, not medical. Nuts, dairy, and soy may appear in cross-recipe photography we do not control at your CMS layer.

## Who this long copy is for

Merchandising teams asked for a **credible, long-form PDP** that still seeds cleanly. You can **trim** in Admin, or point \`fullDescriptionLexical\` in narratives at exported Lexical JSON for full designer control. The seed turns this plain text into **Lexical** with **paragraphs and headings** (lines starting with \`# \`, \`## \`, or \`### \` on their own block become headings—see \`lexicalFromPlainText\` in \`seed-farm-greens.mjs\`).

## Recipe and menu ideas (non-binding)

We mention **Bengali home use** and **cafe** use where obvious: tarka, bhorta, iftar, cold-press, parfait, patisserie, and **kids’ tiffin** are illustrative. You own menu compliance and any **health** positioning on your own site. This block is the same for every SKU so you can **delete or replace** it once in Admin when you are ready.`

const COMMON_BN = `## ফার্ম গ্রিন কীভাবে এই লাইন তালিকাভুক্ত করে

আমরা আগে বলি **কী পাচ্ছেন**: সাধারণত **১ কেজি নেট**—গ্যালারিতে গুচ্ছ বা প্যাক স্পষ্ট না হলে চুক্তি **ওজন**-কেন্দ্রিক। যদি আপনার অপারেশনে **নির্দিষ্ট সংখ্যা** (যেমন ১২টি কিউই) দরকার হয়, নেট কেজির বদলে, সেটা স্টোরফ্রন্ট নীতিতে স্পষ্ট করুন—ফার্ম গ্রিন তথ্য **ওজন-প্রথম** রাখে যাতে ঢাকার রান্নাঘর ও ক্লাউড কিচেন **BDT প্রতি কেজি**-তে তুলনা করতে পারে।

## শেষ মাইল: গুলশান ১ ও মিরপুর ১০

আমাদের ক্যাটালগ-কাহিনি সরল: দুইটি **পাবলিক ডিসপ্যাচ / পিক-আপ** বিন্দু—**গুলশান ১** ও **মিরপুর ১০**—এর সাথে মানচিত্রে **সবুজ বনাম ধূসর** এলাকা ও শিপিং স্তর একই ম্যানিফেস্ট পরিবারে। আপনি যে PDP পড়ছেন, সেটা QA-র জন্য **কোন হাব** থেকে লাইন বেশি স্টেজ হয় তা ধরে রাখে; **স্টোরফ্রন্ট** পরে ক্রেতার কাছে শুধু 'ঢাকা' দেখালেও পিছনের হাব-লজিক স্পষ্ট থাকে। গরম-বৃষ্টিতে **সময়-টু-ডোর** বোঝার জন্য, প্রতি লটের একক উৎস বোঝানোর জন্য নয়।

## গ্যালারির ছবি বনাম কাটের মান

সিড **একাধিক স্টিল** যুক্ত করে; **প্রথম** স্টিল সিড চালু থাকলে Payload-তে **SEO / Open Graph** ছবি হয় (অ্যাডমিনে ওভাররাইড না করলে)। হেভি বিউটি রিটাচ এড়াই—সামান্য শ্যাডো ও কালার ব্যালান্স। যদি লট হিরোর চেয়ে **ডিম্বাকার** বা আকৃতিতে **ভিন্ন** হয়, তবুও **ওজন-লাইন** মান; রিটার্ন নীতি আপনার স্টোরের—ফার্ম গ্রিন শুধু নিশ্চিত করে লাইন প্যাক-আউটে **গ্রেড-নিয়ম** মেনে চলে।

## BDT, তুলনামূলক মূল্য ও Admin-এ যা দেখবেন

ন্যারেটিভ JSON-এ **বিক্রয়মূল্য** বার বার বলতে হবে না। **মূল BDT** মূল manifest-এ। **Compare-at** ও **খরচ** এখানে ঐচ্ছিক—নায়ক SKU ছাড়া বাদ; **অ্যাডমিন-ই** সিদ্ধান্তের উৎস। Compare-at না থাকলে সিড **কল্পিত MSRP** বানায় না; সেল ব্যাজ আপনার পণ্য **sale display mode** অনুসারে।

## ঢাকার আবহাওয়ায় সংরক্ষণ (ব্যবহারিক)

আর্দ্রতা ও লোড-শেডিং সব **তাজা** লাইনকে স্পর্শ করে। **সবজি**: যতটুকু দ্রুত রান্না, ততটুকু ধুয়ে মুছে, তারপর **শ্বাস-চলাচলযোগ্য** ব্যাগে ফ্রিজের **সবচেয়ে ঠাণ্ডা** স্থান—সিল প্লাস্টিকে ঘাম জমে না। **ফল**: পাক **কাউন্টার**-পথে বাড়ান, **ওভার-রাইপ** ধরতে **ফ্রিজ**-এ ঠাণ্ডা করুন। **সুগন্ধি/ঔষধি**: প্রথম ২৪ ঘণ্টা **কাটা ফুলের মতো**—পাতায় অযথা দাঁতিয়ে পানি না। সন্দেহ হলে বড় ব্যাচের আগে **কাটা গন্ধ** দেখে নিন—অপ্রীতিকর গন্ধ হোম ও পেশাদার কিচেনে অগ্রাহ্য।

## এলার্জি-ধরনের নোট (চিকিৎসা নয়)

এসব লাইন **সাধারণ** ফল-সবজি পরিবেশে ঘোরে; আমরা প্রতিটি শেয়ার্ড ফ্যাসিলিটি লেবেল করি না। কেউ **অ্যনাফিল্যাক্সিস**-প্রবণ হলে আপনার সাইটে **নিজস্ব এলার্জি ম্যাট্রিক্স** দিন। ফার্ম গ্রিন কপি **রন্ধন ও লজিসটিক**—চিকিৎসা নয়। বাদাম, দুগ্ধ, সয় আপনার CMS স্তরে ক্রস-রেসিপি ফটোয় থাকতে পারে; আমরা নিয়ন্ত্রণ করি না।

## এত লম্বা কপি কার জন্য

মারচেন্ডাইজিং দল **বিশ্বাসযোগ্য, দীর্ঘ PDP** চায়, কিন্তু সিড **পরিষ্কার** থাকুক। **ছাঁটাই** অ্যাডমিনে করুন, অথবা \`fullDescriptionLexical\`-এ **পূর্ণ Lexical JSON** (ন্যারেটিভ) পয়েন্ট করুন। সিড এখানকার সমতল পাঠ্য থেকে **Lexical** বানায়—\`#\` / \`##\` / \`###\` সহ ব্লক **শিরোনাম**; বিস্তার \`seed-farm-greens.mjs\` থেকে \`lexicalFromPlainText\`।

## রেসিপি ও মেনু ধারণা (অনিবদ্ধ)

আমরা **বাংলা বাড়ির** এবং **ক্যাফে** ব্যবহার যেখানে স্বাভাবিক—তড়কা, ভর্তা, ইফতার, কোল্ড-প্রেস, পারফে, **প্যাটিসারি**, **বাচ্চাদের টিফিন**—ইঙ্গিত মাত্র। মেনু কমপ্লায়েন্স ও **স্বাস্থ্য** দাবি আপনার সাইটের। এই ব্লক **সব SKU-তে** এক—প্রস্তুত হলে অ্যাডমিনে **একবার** মুছে **নিজের কপি** বসান।`

/** Product-specific lead (English + Bangla) — the “why this SKU” before COMMON. Use ## for sub-parts if you like. */
const OPEN = {
  'fg-acai-berries': d(
    `## Berry-forward use cases\n\nThis line is shaped for **açaí-style bowls**, overnight oats, and **high-fibre smoothies** where colour on the spoon matters. We bias toward a consistent **skin look** in the stills so the bowl you build matches what a guest sees in the first photo. Berries in Dhaka move fast: plan to finish within a short window after delivery and keep the line **chilled** before rinsing—humidity in the bag is the enemy, not a little condensation on the clamshell.\n\n## What “1 kg net” really means here\n\nYou are buying **edible weight**, not a branded retail clamshell size that varies by import lane. If the day’s import runs smaller berries, you get more pieces per kg; if the lot runs plumper, you get fewer. The promise is the scale reading, not a Instagram-perfect count.`,
    `## কেন এই লাইন\n\nস্মুদি, বাউল, ও ঠাণ্ডা সকালের খাবার—রং ও ঘনত্ব গুরুত্বপূর্ণ।\n\n## ১ কেজি নেট\n\nওজনই চূড়ান্ত; বেরির আকার আমদানি লটে বদল হতে পারে। ঠাণ্ডা, শক্ত, দ্রুত ব্যবহার।`,
  ),
  'fg-aloe-vera-plant': d(
    `## Aloe as a kitchen ingredient\n\nTreated as **fresh process**, not a supplement claim: heavy **gel yield**, clean stem cut, and minimal sun scald. The yellow layer near the rind is **latex-adjacent**—many people discard it. Fillet the gel for drinks and masks; do not market curative properties unless your legal team approves in your own storefront.\n\n## Practical yield notes\n\nA **1 kg** lot can look physically large; most of the value is in **water and gel**, not in decorative height. Rinse tools between dairy and aloe to avoid off flavours.`,
    `## রান্নাঘরের অ্যালো\n\nজেল-ভরা পাতা, পরিষ্কার কাট; হলুদ স্তর অনেকে ফেলে দেন।\n\n## ১ কেজি\n\nআকার বড় হতে পারে—মূল্য জেল-ওজনে, সাজসজ্জায় নয়।`,
  ),
  'fg-bananas': d(
    `## Ripeness and planning\n\nCavendish-style dessert line: you should smell **sweet stem**, see **unbroken skin**, and get predictable finger length within the band we ship. We sometimes stage **slightly gre**ener bunches for buyers who need a 48–72h window, and more **flecked** fruit for “today” use—your manifest photos are typical, not a day-of promise.\n\n## Don’t fight the room-temp rule\n\n**Under-ripe** bananas are starch-forward; the fridge can stall sweetness conversion. Once speckled, cold slows the last softening. Plan **tiffin, milkshake, pitha, and kheer** on that curve.`,
    `## পাকের পরিকল্পনা\n\nআঙ্গুলের ধার, গন্ধ, খোসা—মিল রাখার চেষ্টা।\n\n## তাপমাত্রা\n\nকাঁচা ঠাণ্ডা করবেন না যদি মিষ্টি চান; ফোটা এলে ফ্রিজ।\n## ব্যবহার\n\ntiffin, মিল্কশেক, পিঠা, খীর—পাক অনুযায়ী।`,
  ),
  'fg-broccoli-vegetable': d(
    `## Floret-first grading\n\nWe care about **crown** density: you pay for what you will cook, not a decorative stem. Look for **tight**, dark-green heads with **minimal yellow beads**. A fast **blanch + ice** keeps colour in pasta, casseroles, and wok work where wok hei and dairy sauces both show up in Dhaka weeknight cooking.\n\n## Humidity in the crisper\n\nWet, sealed bags invite grey mould. Keep a **loose** wrap, dry surface, and use within a sensible window. Broccoli is a **volume line** in restaurant prep—if you are cross-docking, stage cut florets on iced trays in busy hours.`,
    `## ব্রকলি গ্রেডিং\n\nফ্লোরেট ঘন, হলুদ কম; ভাপ বা ঠাণ্ডা পানি রং ধরে।\n\n## সংরক্ষণ\n\nভিজে সিল নয়—শুকনো, ঢিলা ব্যাগ, ক্রিপারে।`,
  ),
  'fg-capsicum': d(
    `## Wall thickness and wok work\n\nSweet capsicum (bell) should have **glossy** skin, **firm** walls, and **no rib mould**. Slices that hold a bite after a quick sauté are what tiffin, fajita prep, and mixed chop need. Colour lines may be mixed in one kg on some weeks; **net weight** is the truth if you are costing per plate.\n\n## Storing in the tray\n\nKeep colour-separated if you are plating; cross-scuffing is cosmetic, but premium boxes care.`,
    `## ক্যাপসিকাম\n\nচকচকে খোসা, মোটা পাত, রঙ স্থিতি।\n\n## ১ কেজি\n\nগণনা চল—ওজন নিশ্চিত।`,
  ),
  'fg-carrot': d(
    `## Snap and kitchen roles\n\nTable carrots: **clean peel**, a **crisp** break, and a sweet–earth balance. Thickness variation is natural; for **halwa** and winter sweets**, grate uniformly** so sugar penetration matches. For **soup and stock**, odd ends are still flavour if washed.\n\n## Kids and tiffin use\n\nSticks in lunchboxes need a **rigid** crunch—sort softer roots for mash and soup.`,
    `## গাজর\n\nমিষ্টি-মাটি ভার; হালুয়া/স্যালাড/সুপে ভিন্ন কাটা।\n\n## স্ন্যাক\n\nঝুরঝুরে লाठी—টিফিনে শক্ত কান্ড বেছে নিন।`,
  ),
  'fg-cucumber': d(
    `## Slicing, raita, and iftar\n\nThin-skin, **low-seed** forward profile for raita, kachumber, and **iftar** platters. Refrigerate; serve cold. If you are **pickling**, use salt draw correctly—Dhaka heat changes brine time.\n\n## Juicing and detox claims\n\nKeep marketing conservative; it is **hydration-friendly juice**, not a medical line.`,
    `## শসা\n\nরায়তা, স্যালাড, ইফতার; পাতলা ছাল।\n\n## আঁচার/জুস\n\nলবণ টানা, সময় ঋতুভিত্তিক।`,
  ),
  'fg-dragon-fruit': d(
    `## Pitaya timing\n\nVibrant skin with **moist** scales, gentle give at the equator, and **clean** separation of flesh from rind. Cube for bowls; add **lime** for aroma on muggy days. 1 kg may be 2–3 fruit—**weight** is the commitment.\n\n## Visual plating\n\nIf you are compressing for fine plating, pre-sort cube sizes; seeds add crunch.`,
    `## ড্রাগন\n\nখোসা-মাংস পৃথক, লেবু; ১ কেজি—ফলের সংখ্যা ভিন্ন।`,
  ),
  'fg-green-apple-fruit': d(
    `## Tart-leaning profile\n\nFirm, **refreshing** acidity for salads with nuts, cheese, and for **chutney** with panch phoron. Not the ultra-sweet red line—**plan sugar** in desserts. Cross-cut and brush with **citrus** if you pre-slice for service.\n\n## Kids vs adults\n\nSome families prefer tarter; note that on your own PDP variant if you run A/B.`,
    `## সবুজ আপেল\n\nটার্ট, স্যালাড, চাটনি; কষ্ট-স মিষ্টি ব্যালান্স।\n## স্লাইস\n\ncytrus-ডিপ, ব্রাউন ধীরে।`,
  ),
  'fg-green-chillies': d(
    `## Heat, pickle, tarka\n\nLength-uniform for **pickle** jars, **tadka** scatter, and **bhorta** heat control. Gloves, ventilation, and **dry** storage—moisture blackens. Taste a sliver if kids eat at the same table: **Scoville** is not lab-printed on this line.\n\n## Cloud-kitchen scale\n\n1 kg is a line size for HORECA; split into 100 g for retail as needed.`,
    `## কাঁচা মরিচ\n\nআচার, তড়কা, ভর্তা; শুষ্ক, ঠাণ্ডা, দ্রুত।\n## তীব্রতা\n\nপরিবারে আগে স্বাদ দেখে নিন।`,
  ),
  'fg-green-lime': d(
    `## Acid and oil yield\n\nThin rind, **zest**-friendly, **juice**-forward for drinks, ceviche-style trials, and **chaat** acid. Roll before squeeze; zesting before or after your choice. **BDT** tracks monsoon and truck delays.\n\n## Avoid bitter pith in syrups\n\nZest, don’t take white pith in bulk for cordials unless you like tannin forward.`,
    `## লেবু\n\nজিঞ্জার, মাছ, চা, চাট; রোল করে রস।\n## সিরাপ\n\nসাদা ত্বক কম, স্বাদে টানin।`,
  ),
  'fg-green-samphire': d(
    `## Salt-forward greens\n\nSucculent, **salty** stem line for seared sides, blanch, and **fusion** salad. If farm-hydroponic rather than tidal, the salt is gentler—**taste** before you salt the pan again.\n\n## Fast service\n\nTextural line: don’t over-wash; **blanch and shock** for colour.`,
    `## স্যামফায়ার-স্টাইল\n\nদ্রুত রান্না, স্যালাড, সেয়ার; লবণ মাত্রা দেখে।`,
  ),
  'fg-green-wheatgrass': d(
    `## Juicing, not a meal\n\nMasticating **yield** is better than centrifugal for this category. Aroma is **very** green; mask with **apple** or **lemon** for family buyers. 1 kg is **HORECA** scale—retail 30–50 g shots. Any **mouldy** off smell: discard, especially in monsoon storage.\n\n## Wellness copy\n\nKeep claims within your own legal; Farm Greens is **ingredient** positioning only.`,
    `## গমের ঘাস\n\nজুস-ফোকাস, বাল্ক, দ্রুত; গন্ধ/আর্দ্রতা দেখে।\n## দাবি\n\nআপনার আইনি সীমায় স্বাস্থ্য-কপি।`,
  ),
  'fg-kiwi-fruit': d(
    `## Ethylene and prep\n\nKiwi is **sensitive to premature mixing** with ethylene-heavy fruit in a sealed box. Serrated slice for pavlovas; a slight **wine** note means you are past the ideal window. **1 kg** count varies; label macros from your own nutrition sheet if you brand meal plans.\n\n## Plating for Dhaka patisserie\n\nUse ring moulds for height; brush neutral glaze if held under AC.`,
    `## কিউই\n\nইথিলিন থেকে আলাদা, স্লাইস, পাক চেক; ১ কেজি—সংখ্যা ভেরি।`,
  ),
  'fg-lemon-grass': d(
    `## Bruise, slice, stock trim\n\nBruise the **base** before cut to release **oils**; soft core only in fine **slivers** for curries. Freeze trim in a zip for **broth** if you are yield-conscious. 1 kg is common for HORECA; retail bundle if you can.\n\n## Aroma checks\n\nFlat aroma may mean a heat-abused line—re-order under your SOP if smell is not bright.`,
    `## লেমনগ্রাস\n\nভাঙিয়ে, মোটা ত্বক ফেলে, সুপ/টম ইয়াম-স্টাইল।\n## গন্ধ\n\nফ্ল্যাট হলে QC।`,
  ),
  'fg-loquat-fruits': d(
    `## Soft fruit handling\n\nGentle like apricot relatives: **single layer** ripening, **stem-down**, watch for tan **bruise**. Musky-sweet, nice with **ginger** syrup. Count per kg can be high with small fruit—**weight** is retail truth. Peel for delicate **dessert** if tannins bother you.\n\n## Seasonal drops\n\nExotics can skip weeks; watch PDP **publishedAt** in Admin.`,
    `## লকাট\n\nনরম, এক স্তরে পাক, আদা সিরাপ; ১ কেজি—ছোট ফল ঘন।`,
  ),
  'fg-organic-corn-cob-maize': d(
    `## Milk stage and BDT swings\n\nSweet corn for **grill, makkai, chowder**: **milk** stage, silk trimmed, husked weight differs from in-husk. **1 kg** is typically 2–4 ears. **Festival** BBQ windows in Dhaka can spike BDT; compare-at in Admin can reflect that honestly.\n\n## Organic claim\n\nIf the **certificate** is with the import lot, attach your own reference in Admin if you rebrand retail.`,
    `## মকাই\n\nভুট্টা, বারবিকিউ, সুপ, রুটি-টেস্ট; ১ কেজি—কাণ্ড সংখ্যা ভেরি।\n## জৈব\n\nআপনার সার্ট-রেফ যদি খুচরায় দাবি।`,
  ),
  'fg-pepper': d(
    `## Whole pepper, savoury use\n\nIf this lot is **black / mixed peppercorn** style, crack **to order**; pre-grind loses volatile oils. For **tarka** and **garam** builds, keep colours separated if you **plate** tarka layers. **1 kg** is spice-drawer size—repack in **light-proof** jars on humid monsoon days.\n\n## Catalogue name\n\nThe seed uses the historical slug **"Pepper"**; align product title in Admin to your true botanical and photo set.`,
    `## মরিচ/গোলমরিচ\n\nতাজা ভাঙা, হালকা জার; ১ কেজি—শুষ্ক ঝুরি, আর্দ্রতা এড়ান।\n## নাম\n\nঅ্যাডমিনে বটানিক্যাল-টাইটল মিলান।`,
  ),
  'fg-pile-of-cherries': d(
    `## Pitting economics\n\nDark sweet cherries: **pitter** or chopstick; factor **labour** into compote, ice-cream, and patisserie price. Dull sheen and **stems** that snap green (when present) are good QC. **1 kg** is premium; yield after pitting is your margin story.\n\n## Drinks\n\nMuddle gently; syruping needs **sugar** balance in humidity.`,
    `## চেরি\n\nপিট, কমপোট, কেক; ১ কেজি—প্রিমিয়াম, দ্রুত ঠাণ্ডা।`,
  ),
  'fg-pineapple': d(
    `## Ripeness and yield\n\nGolden eye, **hollow thump** vs creamy base feel; leaf tip brown in transit is common—cut face tells sugar. **1 kg** may be a **mid** fruit; pre-cut in stores doesn’t always match this weight line—here we’re net-fruit.\n\n## Grill, juice, gur\n\nRounds for **dessert**; juice with **mint** for iftar. Store upright on cut to limit oxidation if face-exposed.\n\n## Rainy transport\n\nScuffed shell: taste first; **BDT** moves with week.`,
    `## আনারস\n\nকাটা মাংস, জুস, গ্রিল; ১ কেজি—আকার চিত্রে।\n## গন্ধ-সুগন্ধ\n\nখোসা স্বাভাবিকভাবে স্কাফ; স্বাদই সত্যি।`,
  ),
  'fg-raw-eggplant': d(
    `## Roast and bhorta\n\nGlossy, **medium density**—heavy for size often means less spongy cells after **roast**. Stems should look **fresh**; scarring is cosmetic. **1 kg** is usually 3–6 fruit; count is not a promise. **Bitterness**: salt and drain older lots if needed.\n\n## Vegan / vegetarian menus\n\nCross-use with dairy in many Dhaka lines—separate if you need strict V branding.`,
    `## বেগুন\n\nভর্তা, ভাজা, পোলাও-সঙ্গ; ১ কেজি—সংখ্যা ভেরি, তিক্তুতা দেখে।`,
  ),
  'fg-red-berry-strawberry': d(
    `## Humidity, hull, and pastry\n\nAromatic, **hull to order**; keep **paper-dry** in the tray. **Maceration** rescues soft lots for compote, not for garnish. **1 kg** is HORECA and gifting; sort photo-grade for pass use. **Cream and pistachio** for patisserie; balance acid with dairy.\n\n## Price spikes\n\n**Air-freight** changes weekly—**compare-at** in Admin is fair during spikes.`,
    `## স্ট্রবেরি\n\nক্রিম, পেস্তা, কেক; ১ কেজি—আর্দ্রতায় দ্রুত, প্রিমিয়াম।`,
  ),
  'fg-species': d(
    `## "Species" in the source catalogue\n\nTreated as a **mixed spices & aromatics** basket for **pickle, tarka, and masala toasting**—**lot composition may rotate**. Read the in-pack list each time; if you need a static SKU, file a new product. **1 kg** is bulk: repack 100–250 g with **O₂ barriers** in monsoon. **Pesticide and moisture** guard per your SOP—silica sachet optional in premium repack.\n\n## Not a single botanical\n\nTitle in Admin should eventually match reality—rename when ready without breaking slug in storefront mapping.`,
    `## 'Species' = মিশ্র মসলা\n\nলট ঘোরে—প্যাকের তালিকা পড়ে নিন; ১ কেজি—বাল্ক।\n## নাম\n\nঅ্যাডমিনে স্পষ্ট শিরোনাম—স্লাগ ঠিক রাখুন।`,
  ),
  'fg-spirulina-seaweed-healthy-food': d(
    `## Iodine, allergens, and claims\n\nSpirulina / algal **superfood** lines may combine ingredients—**always** read the **certificate** for iodine and **allergen** statements. If you cold-press, start **small** in the cup to manage oceanic aftertaste. 1 kg is **HORECA**; retail repack 50–100 g with bilingual instructions. **Mould/odour** = discard, especially in humid monsoon. **Not** a meal replacement in our copy; your legal for wellness claims.\n\n## Masking in smoothies\n\n**Apple, lemon, ginger** help family palates. (Headings in copy use \`# \` / \`## \` / \`### \` at the start of a block, separated by blank lines; the seeder turns those into Lexical headings.)`,
    `## স্পিরুলিনা/সিউইড\n\nআয়োডিন/অ্যালার্জি—সার্ট; ছোট পোরশন, দ্রুত গন্ধ-চেক।\n## দাবি\n\nআপনার আইনে স্বাস্থ্য-মার্ক।`,
  ),
  'fg-sweet-pepper': d(
    `## Stuffed, skewer, tray\n\nThick **sweet** walls, low heat, **bake**-friendly for keema and rice fills. If your menu needs **all red**, note mixed-colour in **week** on some import cycles. Refrigerate, dry, don’t **stack** heavy on thin walls. Taste a sliver before a big **sauce** if wall thickness is thinner one week (greenhouse change).\n\n## Vegetarian and vegan\n\nClarify cheese vs plant fill on your own PDP variants.`,
    `## মিষ্টি ক্যাপসিকাম\n\nস্টাফ, কাবাব, ট্রে; ১ কেজি—রঙের মিশ্রণ সম্ভব।`,
  ),
  'fg-tea-leaves': d(
    `## Hygroscopic tea\n\nRepack in **foil** with a tight roll after open. **Steep** time = tannin: shorter for a lighter cup, longer for a **Dhaba**-style if the grade allows. 1 kg is **cafe** volume; **orthodox** local lines can shift **less** in BDT than auction imports. Store away from **coffee and whole spices**.\n\n## Not sachet weight\n\nThis PDP is **loose tea**; bag conversion is on your SOP, not the seed line.`,
    `## চা-পাতা\n\nফয়েল, ভাপ সময়, ১ কেজি—ক্যাফে বাল্ক; ব্যাগ-ওজন এখানে নয়।`,
  ),
  'fg-watermelon': d(
    `## Cut-fruit policy vs whole-fruit\n\nThe manifest photos may show a **whole** melon; this listing is a **1 kg** net **cut-fruit** line in many operational interpretations—if you sell by whole fruit instead, that is a **separate** SKU. Field spot, **hollow thump**, and **stripe** read are the classic **whole** tests; for cut, we focus on **sugar, texture**, and **juice** clarity.\n\n## Iftar and juice\n\n**Black salt, mint**, classic Dhaka; manage ethylene on mixed fruit trays. **BDT** in heat waves tracks juice-yield expectations.`,
    `## তরমুজ\n\nকেটা ১ কেজি বনাম গোটা—নীতি স্টোরে; রস, ইফতার, গরমে মূল্য।`,
  ),
  'fg-yellow-apple-fruit': d(
    `## Honey-forward angle\n\n**Yellow** profiles trade some acidity for **sweeter** finish—good for **pie**, **chutney** with panch phoron, and **sauce** that needs less added sugar. **1 kg** count varies. Wash **wax** off before zest; ethylene is **moderate**—short windows sharing a drawer with other fruit.\n\n## Event plating\n\nTaste a fruit before **buffet** service if the week’s import is softer.`,
    `## হলুদ আপেল\n\nমিষ্টি, পাই, চাটনি; ১ কেজি—সংখ্যা ভেরি, মোম ধুয়ে জেসট।`,
  ),
  'fg-yellow-cherries': d(
    `## Blush, aroma, and labour\n\n**Gold** lines = often **floral** aroma, sometimes **softer** acidity than crimson. **Maceration** can be **shorter**; **pitting** is still the yield anchor. 1 kg is **patisserie**-grade in Dhaka—QC scuff, **chill**, stack light with **foam** if reboxing. BDT follows **air** windows; **compare-at** in seasonal spikes is honest.\n\n## Brandy preserve angle\n\nIf you run preserves, your alcohol compliance is on your own licence, not the seed line.`,
    `## হলুদ/গোল্ড চেরি\n\nসুগন্ধ, পিট, ১ কেজি—প্রিমিয়াম, ব্রান্ডি-জ্যাম? লাইসেন্স আপনার।`,
  ),
}

function joinFull(o) {
  return d(`${o.en}\n\n${COMMON_EN}`, `${o.bn}\n\n${COMMON_BN}`)
}

const baseMeta = (titleEn, titleBn) => ({
  metaTitle: d(titleEn, titleBn),
})

const products = {
  'fg-acai-berries': {
    sku: 'FG-ACAI',
    shortDescription: d(
      '1 kg açaí-style berries—bowls, smoothies, parfaits; cold-sorted, plump, colour-true for the gallery.',
      'বেরি ১ কেজি—বাউল, স্মুদি; ঠাণ্ডা বাছাই, রঙ-সত্যি।',
    ),
    fullDescription: joinFull(OPEN['fg-acai-berries']),
    ...baseMeta('Açaí-style berries 1kg | Farm Greens (BDT)', 'বেরি ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d(
      '1 kg açaí-style berries, smoothie bowls, BDT, Farm Greens Dhaka, long PDP with headings.',
      'স্মুদি, বাউল, BDT, ফার্ম গ্রিন, দীর্ঘ বর্ণনা।',
    ),
    publishedAt: '2025-10-01T08:00:00.000Z',
  },
  'fg-aloe-vera-plant': {
    sku: 'FG-ALOE',
    shortDescription: d(
      '1 kg mature aloe—gel-forward leaves for drinks, DIY skin/hair; minimal sun scald, clean cut.',
      'অ্যালো ১ কেজি—জেল, ঘরোয়া ব্যবহার; পরিষ্কার কাট।',
    ),
    fullDescription: joinFull(OPEN['fg-aloe-vera-plant']),
    ...baseMeta('Aloe 1kg | Farm Greens', 'অ্যালো ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d(
      '1 kg aloe leaves, BDT, Farm Greens, gel yield focus.',
      'অ্যালো, BDT, ফার্ম গ্রিন।',
    ),
    publishedAt: '2025-10-02T08:00:00.000Z',
  },
  'fg-bananas': {
    sku: 'FG-BANANAS',
    shortDescription: d(
      '1 kg dessert bananas—stem aroma, skin integrity, tiffin and milkshake friendly.',
      'কলা ১ কেজি—সুগন্ধ, টিফিন, মিল্কশেক।',
    ),
    fullDescription: joinFull(OPEN['fg-bananas']),
    ...baseMeta('Bananas 1kg | Farm Greens', 'কলা ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg bananas, BDT, Farm Greens, Dhaka.', 'কলা, BDT, ঢাকা।'),
    publishedAt: '2025-10-03T10:00:00.000Z',
  },
  'fg-broccoli-vegetable': {
    sku: 'FG-BROCCOLI',
    shortDescription: d(
      '1 kg tight broccoli florets—wok, roast, pasta; floret-first, minimal yellow.',
      'ব্রকলি ১ কেজি—ওভেন, ওক; ঘন ফ্লোরেট।',
    ),
    fullDescription: joinFull(OPEN['fg-broccoli-vegetable']),
    ...baseMeta('Broccoli 1kg | Farm Greens', 'ব্রকলি ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg broccoli, BDT, Farm Greens.', 'ব্রকলি, BDT, ফার্ম গ্রিন।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-capsicum': {
    sku: 'FG-CAPSICUM',
    shortDescription: d(
      '1 kg sweet capsicum—thick walls, fajita, pizza, tiffin; glossy skin.',
      'ক্যাপসিকাম ১ কেজি—মোটা পাত, রং স্থিতি।',
    ),
    fullDescription: joinFull(OPEN['fg-capsicum']),
    ...baseMeta('Capsicum 1kg | Farm Greens', 'ক্যাপসিকাম ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg capsicum, BDT, Farm Greens.', 'ক্যাপসিকাম, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-carrot': {
    sku: 'FG-CARROT',
    shortDescription: d(
      '1 kg table carrots—snap, sweet-earth balance, halwa and soup friendly.',
      'গাজর ১ কেজি—মিষ্টি-মাটি, হালুয়া/সুপ।',
    ),
    fullDescription: joinFull(OPEN['fg-carrot']),
    ...baseMeta('Carrots 1kg | Farm Greens', 'গাজর ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg carrots, BDT, Farm Greens.', 'গাজর, BDT।'),
    publishedAt: '2025-10-05T10:00:00.000Z',
  },
  'fg-cucumber': {
    sku: 'FG-CUCUMBER',
    shortDescription: d(
      '1 kg slicing cucumbers—raita, salad, iftar; thin skin, crisp.',
      'শসা ১ কেজি—রায়তা, স্যালাড, ইফতার।',
    ),
    fullDescription: joinFull(OPEN['fg-cucumber']),
    ...baseMeta('Cucumber 1kg | Farm Greens', 'শসা ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg cucumber, BDT, Farm Greens.', 'শসা, BDT।'),
    publishedAt: '2025-10-05T10:00:00.000Z',
  },
  'fg-dragon-fruit': {
    sku: 'FG-DRAGON',
    shortDescription: d(
      '1 kg pitaya / dragon fruit—bowls, bright platters, lime-friendly in humidity.',
      'ড্রাগন ১ কেজি—প্ল্যাটার, বাউল, লেবু।',
    ),
    fullDescription: joinFull(OPEN['fg-dragon-fruit']),
    ...baseMeta('Dragon fruit 1kg | Farm Greens', 'ড্রাগন ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg dragon fruit, BDT, Farm Greens.', 'ড্রাগন, BDT।'),
    publishedAt: '2025-10-02T10:00:00.000Z',
  },
  'fg-green-apple-fruit': {
    sku: 'FG-GREEN-APPLE',
    shortDescription: d(
      '1 kg green apple—tart, firm, salad and chutney, school-snack option.',
      'সবুজ আপেল ১ কেজি—টার্ট, স্যালাড।',
    ),
    fullDescription: joinFull(OPEN['fg-green-apple-fruit']),
    ...baseMeta('Green apple 1kg | Farm Greens', 'সবুজ আপেল ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg green apples, BDT, Farm Greens.', 'সবুজ আপেল, BDT।'),
    publishedAt: '2025-10-06T10:00:00.000Z',
  },
  'fg-green-chillies': {
    sku: 'FG-GREEN-CHILLIES',
    shortDescription: d(
      '1 kg hot green chillies—pickle, tarka, bhorta; uniform length when the lot allows.',
      'কাঁচা মরিচ ১ কেজি—আচার, তড়কা।',
    ),
    fullDescription: joinFull(OPEN['fg-green-chillies']),
    ...baseMeta('Green chillies 1kg | Farm Greens', 'কাঁচা মরিচ ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg green chillies, BDT, Farm Greens.', 'কাঁচা মরিচ, BDT।'),
    publishedAt: '2025-10-01T10:00:00.000Z',
  },
  'fg-green-lime': {
    sku: 'FG-GREEN-LIME',
    shortDescription: d(
      '1 kg limes—zest, juice, chaat, fish; oil yield when rolled.',
      'লেবু ১ কেজি—জিঞ্জার, মাছ, চা।',
    ),
    fullDescription: joinFull(OPEN['fg-green-lime']),
    ...baseMeta('Lime 1kg | Farm Greens', 'লেবু ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg limes, BDT, Farm Greens.', 'লেবু, BDT।'),
    publishedAt: '2025-10-01T10:00:00.000Z',
  },
  'fg-green-samphire': {
    sku: 'FG-SAMPHIRE',
    shortDescription: d(
      '1 kg samphire-style green—sear, blanch, fusion salad; salt note varies by source.',
      'স্যামফায়ার-স্টাইল ১ কেজি—সেয়ার, স্যালাড।',
    ),
    fullDescription: joinFull(OPEN['fg-green-samphire']),
    ...baseMeta('Green samphire 1kg | Farm Greens', 'স্যামফায়ার ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg samphire-style greens, BDT, Farm Greens.', 'স্যামফায়ার, BDT।'),
    publishedAt: '2025-10-07T10:00:00.000Z',
  },
  'fg-green-wheatgrass': {
    sku: 'FG-WHEATGRASS',
    shortDescription: d(
      '1 kg fresh wheatgrass—juicing, shots; not a meal; bulk HORECA scale.',
      'গমের ঘাস ১ কেজি—জুস, শরবত, বাল্ক।',
    ),
    fullDescription: joinFull(OPEN['fg-green-wheatgrass']),
    ...baseMeta('Wheatgrass 1kg | Farm Greens', 'গমের ঘাস ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg wheatgrass, BDT, Farm Greens.', 'ঘাস জুস, BDT।'),
    publishedAt: '2025-10-08T10:00:00.000Z',
  },
  'fg-kiwi-fruit': {
    sku: 'FG-KIWI',
    shortDescription: d(
      '1 kg kiwi—pavlova, fruit cups, ethylene-care in storage.',
      'কিউই ১ কেজি—কাপ, কেক।',
    ),
    fullDescription: joinFull(OPEN['fg-kiwi-fruit']),
    ...baseMeta('Kiwi 1kg | Farm Greens', 'কিউই ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg kiwi, BDT, Farm Greens.', 'কিউই, BDT।'),
    publishedAt: '2025-10-03T10:00:00.000Z',
  },
  'fg-lemon-grass': {
    sku: 'FG-LEMONGRASS',
    shortDescription: d(
      '1 kg lemongrass—broth, Tom Yum style, tea; bruise the base, sliver the core.',
      'লেমনগ্রাস ১ কেজি—সুপ, চা।',
    ),
    fullDescription: joinFull(OPEN['fg-lemon-grass']),
    ...baseMeta('Lemongrass 1kg | Farm Greens', 'লেমনগ্রাস ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg lemongrass, BDT, Farm Greens.', 'লেমনগ্রাস, BDT।'),
    publishedAt: '2025-10-02T10:00:00.000Z',
  },
  'fg-loquat-fruits': {
    sku: 'FG-LOQUAT',
    shortDescription: d(
      '1 kg loquat—hand fruit, compote, gentle handling like apricot kin.',
      'লকাট ১ কেজি—কমপোট, সুন্দর পাক।',
    ),
    fullDescription: joinFull(OPEN['fg-loquat-fruits']),
    ...baseMeta('Loquat 1kg | Farm Greens', 'লকাট ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg loquat, BDT, Farm Greens.', 'লকাট, BDT।'),
    publishedAt: '2025-10-03T10:00:00.000Z',
  },
  'fg-organic-corn-cob-maize': {
    sku: 'FG-CORN',
    shortDescription: d(
      '1 kg sweet corn cobs—grill, chowder, makkai; milk stage, silk trim.',
      'মকাই ১ কেজি—বারবিকিউ, সুপ।',
    ),
    fullDescription: joinFull(OPEN['fg-organic-corn-cob-maize']),
    ...baseMeta('Sweet corn 1kg | Farm Greens', 'মকাই ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg corn, BDT, Farm Greens.', 'মকাই, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-pepper': {
    sku: 'FG-PEPPER',
    shortDescription: d(
      '1 kg whole pepper (culinary line)—tarka, grind-to-order, spice-mix; aroma when cracked.',
      'মরিচ ১ কেজি—তড়কা, গুড়া।',
    ),
    fullDescription: joinFull(OPEN['fg-pepper']),
    ...baseMeta('Culinary pepper 1kg | Farm Greens', 'মরিচ ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg pepper, BDT, Farm Greens.', 'মরিচ, BDT।'),
    publishedAt: '2025-10-01T10:00:00.000Z',
  },
  'fg-pile-of-cherries': {
    sku: 'FG-CHERRIES-RED',
    shortDescription: d(
      '1 kg red cherries—compote, cake, pit labour in yield planning.',
      'চেরি ১ কেজি—কেক, কমপোট।',
    ),
    fullDescription: joinFull(OPEN['fg-pile-of-cherries']),
    ...baseMeta('Cherries 1kg | Farm Greens', 'চেরি ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg cherries, BDT, Farm Greens.', 'চেরি, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-pineapple': {
    sku: 'FG-PINEAPPLE',
    shortDescription: d(
      '1 kg pineapple—juice, grill, tarts; sugar ring at the cut, muggy-weather BDT note.',
      'আনারস ১ কেজি—জুস, গ্রিল।',
    ),
    fullDescription: joinFull(OPEN['fg-pineapple']),
    ...baseMeta('Pineapple 1kg | Farm Greens', 'আনারস ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg pineapple, BDT, Farm Greens.', 'আনারস, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-raw-eggplant': {
    sku: 'FG-EGGPLANT',
    shortDescription: d(
      '1 kg brinjals—bhorta, roast, begun bhaja; glossy, creamy when fire-roasted.',
      'বেগুন ১ কেজি—ভর্তা, রোস্ট।',
    ),
    fullDescription: joinFull(OPEN['fg-raw-eggplant']),
    ...baseMeta('Eggplant 1kg | Farm Greens', 'বেগুন ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg eggplant, BDT, Farm Greens.', 'বেগুন, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-red-berry-strawberry': {
    sku: 'FG-STRAWBERRY',
    shortDescription: d(
      '1 kg strawberries—pastry, maceration, cold dessert bars; paper-dry tray.',
      'স্ট্রবেরি ১ কেজি—কেক, ডেজার্ট।',
    ),
    fullDescription: joinFull(OPEN['fg-red-berry-strawberry']),
    ...baseMeta('Strawberry 1kg | Farm Greens', 'স্ট্রবেরি ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg strawberries, BDT, Farm Greens.', 'স্ট্রবেরি, BDT।'),
    publishedAt: '2025-10-05T10:00:00.000Z',
  },
  'fg-species': {
    sku: 'FG-SPICEMIX',
    shortDescription: d(
      '1 kg mixed spices & aromatics (see long PDP)—rotating lot, repack in humidity.',
      'মসলা মিশ্র ১ কেজি—লট দেখে, শুষ্ক ঝুড়ি।',
    ),
    fullDescription: joinFull(OPEN['fg-species']),
    ...baseMeta('Spice & aromatics mix 1kg | Farm Greens', 'মসলা ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg spice mix, BDT, Farm Greens.', 'মসলা, BDT।'),
    publishedAt: '2025-10-06T10:00:00.000Z',
  },
  'fg-spirulina-seaweed-healthy-food': {
    sku: 'FG-SPIRULINA',
    shortDescription: d(
      '1 kg spirulina / algal line—smoothies, re-pack retail; read allergen / iodine on cert.',
      'স্পিরুলিনা/সিউইড ১ কেজি—জুস, ছোট প্যাক।',
    ),
    fullDescription: joinFull(OPEN['fg-spirulina-seaweed-healthy-food']),
    ...baseMeta('Spirulina & seaweed 1kg | Farm Greens', 'স্পিরুলিনা ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg spirulina/seaweed, BDT, Farm Greens, read cert.', 'স্পিরুলিনা, BDT, লেবেল।'),
    publishedAt: '2025-10-08T10:00:00.000Z',
  },
  'fg-sweet-pepper': {
    sku: 'FG-SWEET-PEPPER',
    shortDescription: d(
      '1 kg sweet peppers—stuffed, tray bake, fajita; thick walls, colour may mix in kg.',
      'মিষ্টি ক্যাপসিকাম ১ কেজি—স্টাফ, ট্রে।',
    ),
    fullDescription: joinFull(OPEN['fg-sweet-pepper']),
    ...baseMeta('Sweet pepper 1kg | Farm Greens', 'মিষ্টি ক্যাপসিকাম ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg sweet pepper, BDT, Farm Greens.', 'মিষ্টি পেপার, BDT।'),
    publishedAt: '2025-10-05T10:00:00.000Z',
  },
  'fg-tea-leaves': {
    sku: 'FG-TEA-LEAVES',
    shortDescription: d(
      '1 kg loose tea—chai, cold brew, cafe volume; foil repack, hygroscopic.',
      'চা-পাতা ১ কেজি—দুধ-চা, কোল্ড-ব্রিউ।',
    ),
    fullDescription: joinFull(OPEN['fg-tea-leaves']),
    ...baseMeta('Tea leaves 1kg | Farm Greens', 'চা-পাতা ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg tea leaves, BDT, Farm Greens.', 'চা, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
  'fg-watermelon': {
    sku: 'FG-WATERMELON',
    shortDescription: d(
      '1 kg cut watermelon / fruit line—clarify cut vs whole in your policy; iftar, juice.',
      'তরমুজ ১ কেজি—কাটা লাইন, ইফতার, জুস।',
    ),
    fullDescription: joinFull(OPEN['fg-watermelon']),
    ...baseMeta('Watermelon 1kg | Farm Greens', 'তরমুজ ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg watermelon, BDT, Farm Greens.', 'তরমুজ, BDT।'),
    publishedAt: '2025-10-05T10:00:00.000Z',
  },
  'fg-yellow-apple-fruit': {
    sku: 'FG-YELLOW-APPLE',
    shortDescription: d(
      '1 kg yellow apple—honey-forward, pie, chutney, softer bite than green line.',
      'হলুদ আপেল ১ কেজি—পাই, চাটনি।',
    ),
    fullDescription: joinFull(OPEN['fg-yellow-apple-fruit']),
    ...baseMeta('Yellow apple 1kg | Farm Greens', 'হলুদ আপেল ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg yellow apple, BDT, Farm Greens.', 'হলুদ আপেল, BDT।'),
    publishedAt: '2025-10-05T10:00:00.000Z',
  },
  'fg-yellow-cherries': {
    sku: 'FG-CHERRIES-YELLOW',
    shortDescription: d(
      '1 kg gold / blush cherries—tarts, light acidity, patisserie; pit yield and chill.',
      'গোল্ড চেরি ১ কেজি—টার্ট, ঠাণ্ডা।',
    ),
    fullDescription: joinFull(OPEN['fg-yellow-cherries']),
    ...baseMeta('Gold cherries 1kg | Farm Greens', 'গোল্ড চেরি ১কেজি | ফার্ম গ্রিন'),
    metaDescription: d('1 kg gold cherries, BDT, Farm Greens.', 'গোল্ড চেরি, BDT।'),
    publishedAt: '2025-10-04T10:00:00.000Z',
  },
}

const EXPECTED = 29
const keys = Object.keys(products)
if (keys.length !== EXPECTED) {
  console.error('Expected', EXPECTED, 'products, got', keys.length)
  process.exit(1)
}

for (const k of Object.keys(OPEN)) {
  if (!products[k]) console.warn('Missing product for OPEN key', k)
}
for (const k of Object.keys(products)) {
  if (!OPEN[k]) console.warn('Missing OPEN for product', k)
}

writeFileSync(out, JSON.stringify({ products }, null, 2), 'utf8')
console.log('Wrote', out, '—', keys.length, 'slugs; long fullDescription = OPEN + COMMON')
