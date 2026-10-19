/**
 * =========================================================================
 * INFINX ADVANCED OTAKU PROFILE & PASSPORT CONTROLLER
 * =========================================================================
 */

(function () {
  'use strict';

  const API_BASE = '/api';
  let currentUserProfile = null;

  function normalizeAssetUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('assets/') || trimmed.startsWith('Postes/') || trimmed.startsWith('uploads/')) {
      return '/' + trimmed;
    }
    if (trimmed.startsWith('/assets/') || trimmed.startsWith('/Postes/') || trimmed.startsWith('/uploads/')) {
      return trimmed;
    }
    if (trimmed.startsWith('av-') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
      return `/assets/avatars/${trimmed.replace(/^\/+/, '')}`;
    }
    if (trimmed.startsWith('ban-')) {
      return `/assets/banners/${trimmed.replace(/^\/+/, '')}`;
    }
    return trimmed;
  }

  // Preset Anime Avatars (67 Iconic Characters: Main Protagonists Level 25 to 50, Side Characters at Low Level 1-15)
  const AVATAR_PRESETS = [

    // Level 1: Starter / Genin tier (Side & Companion Characters - Unlocked by Default)
    { id: 'av-tony-tony-chopper', name: 'Tony Tony Chopper', anime: 'ONE PIECE', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-tony-tony-chopper.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b309-H64NhbJ2ywIQ.jpg' },
    { id: 'av-usopp', name: 'Usopp (Sogeking)', anime: 'ONE PIECE', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-usopp.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b724-GFGgI9AJQkfy.jpg' },
    { id: 'av-krillin', name: 'Krillin', anime: 'Dragon Ball Z', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-krillin.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b2159-qtEuMYyOUkwY.jpg' },
    { id: 'av-zenitsu-agatsuma', name: 'Zenitsu Agatsuma', anime: 'Demon Slayer', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-zenitsu-agatsuma.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b129131-FZrQ7lSlxmEr.png' },
    { id: 'av-inosuke-hashibira', name: 'Inosuke Hashibira', anime: 'Demon Slayer', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-inosuke-hashibira.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/n129130-SJC0Kn1DU39E.jpg' },
    { id: 'av-rock-lee', name: 'Rock Lee', anime: 'Naruto', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-rock-lee.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b306-oUTOO45xInXt.png' },
    { id: 'av-konohamaru-sarutobi', name: 'Konohamaru Sarutobi', anime: 'Naruto', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-konohamaru-sarutobi.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/n3889-gCUewPsRY2kD.png' },
    { id: 'av-armin-arlert', name: 'Armin Arlert', anime: 'Attack on Titan', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-armin-arlert.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b46494-g7xYYuBtYPnO.png' },
    { id: 'av-sasha-braus', name: 'Sasha Braus', anime: 'Attack on Titan', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-sasha-braus.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b45887-QPtJH0KwqthW.jpg' },
    { id: 'av-anya-forger', name: 'Anya Forger', anime: 'SPY x FAMILY', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-anya-forger.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b138100-4Li0tWRCa5bQ.png' },
    { id: 'av-arataka-reigen', name: 'Arataka Reigen', anime: 'Mob Psycho 100', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-arataka-reigen.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89334-OPj1hCzvrt7X.png' },
    { id: 'av-kurapika', name: 'Kurapika', anime: 'Hunter x Hunter', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-kurapika.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b28-ivA7UGnfE40a.png' },
    { id: 'av-maomao', name: 'Maomao', anime: 'The Apothecary Diaries', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-maomao.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b126824-MqsCncTO1qpv.png' },
    { id: 'av-emilia', name: 'Emilia', anime: 'Re:ZERO', levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-emilia.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b88572-IzTwXEHSobRs.jpg' },

    // Level 5: Genin / Rising Star tier (Notable Supporting Characters)
    { id: 'av-panda', name: 'Panda', anime: 'JUJUTSU KAISEN', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-panda.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b137974-9qnK3DPrvLKh.jpg' },
    { id: 'av-megumi-fushiguro', name: 'Megumi Fushiguro', anime: 'JUJUTSU KAISEN', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-megumi-fushiguro.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b126635-L0y3I92JSUkN.png' },
    { id: 'av-nobara-kugisaki', name: 'Nobara Kugisaki', anime: 'JUJUTSU KAISEN', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-nobara-kugisaki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b133700-f6sOO3TcgLV6.png' },
    { id: 'av-aoi-todo', name: 'Aoi Todo', anime: 'JUJUTSU KAISEN', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-aoi-todo.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b137975-6TH7PiLWJaqy.png' },
    { id: 'av-genos', name: 'Genos', anime: 'One-Punch Man', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-genos.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b73979-tVi9maPID881.jpg' },
    { id: 'av-shikamaru-nara', name: 'Shikamaru Nara', anime: 'Naruto', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-shikamaru-nara.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b2007-QaesJlIZDifj.jpg' },
    { id: 'av-kiba-inuzuka', name: 'Kiba Inuzuka', anime: 'Naruto', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-kiba-inuzuka.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/n3495-dtw0gHa5SOo6.png' },
    { id: 'av-loid-forger', name: 'Loid Forger (Twilight)', anime: 'SPY x FAMILY', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-loid-forger.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b138101-7NCB0Md8zA6G.png' },
    { id: 'av-nezuko-kamado', name: 'Nezuko Kamado', anime: 'Demon Slayer', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-nezuko-kamado.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b127518-NRlq1CQ1v1ro.png' },
    { id: 'av-mai-sakurajima', name: 'Mai Sakurajima', anime: 'Bunny Girl Senpai', levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-mai-sakurajima.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b127222-Jh5hhP7vZ7s1.png' },

    // Level 15: Chunin Veteran tier (Elite Allies, Rivals & Strong Side Characters)
    { id: 'av-zoro-roronoa', name: 'Zoro Roronoa', anime: 'ONE PIECE', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-zoro-roronoa.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-S7oAeA9WInjV.png' },
    { id: 'av-sasuke-uchiha', name: 'Sasuke Uchiha', anime: 'Naruto', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-sasuke-uchiha.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b13-SISLEw1oAD7a.png' },
    { id: 'av-gaara', name: 'Gaara of the Sand', anime: 'Naruto', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-gaara.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b1662-4E5J0LX9jZKZ.png' },
    { id: 'av-roy-mustang', name: 'Roy Mustang', anime: 'Fullmetal Alchemist', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-roy-mustang.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b68-moBLY2WO2am3.png' },
    { id: 'av-katsuki-bakugou', name: 'Katsuki Bakugo', anime: 'My Hero Academia', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-katsuki-bakugou.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b88892-bdOha3lNcaN6.png' },
    { id: 'av-shouto-todoroki', name: 'Shoto Todoroki', anime: 'My Hero Academia', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-shouto-todoroki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89220-KNBwaVFAR8FD.png' },
    { id: 'av-killua-zoldyck', name: 'Killua Zoldyck', anime: 'Hunter x Hunter', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-killua-zoldyck.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b27-Z5O02kQUydpT.jpg' },
    { id: 'av-hisoka-morow', name: 'Hisoka Morow', anime: 'Hunter x Hunter', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-hisoka-morow.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b31-FZckOuu7L1un.png' },
    { id: 'av-mikasa-ackerman', name: 'Mikasa Ackerman', anime: 'Attack on Titan', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-mikasa-ackerman.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png' },
    { id: 'av-yor-forger', name: 'Yor Forger (Thorn Princess)', anime: 'SPY x FAMILY', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-yor-forger.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b138102-ZOAu9jI2d5ke.png' },
    { id: 'av-power', name: 'Power', anime: 'Chainsaw Man', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-power.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b137079-6yLEUYR3bmpr.png' },
    { id: 'av-makima', name: 'Makima', anime: 'Chainsaw Man', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-makima.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png' },
    { id: 'av-kaguya-shinomiya', name: 'Kaguya Shinomiya', anime: 'Kaguya-sama', levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-kaguya-shinomiya.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b120649-NPaWaIpWy60E.png' },

    // Level 25: Jounin Elite tier (Iconic Main Protagonists & Legendary Masters)
    { id: 'av-tanjirou-kamado', name: 'Tanjirou Kamado', anime: 'Demon Slayer', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-tanjirou-kamado.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-BTNEc1nRIv68.png' },
    { id: 'av-yuuji-itadori', name: 'Yuuji Itadori', anime: 'JUJUTSU KAISEN', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-yuuji-itadori.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b127212-FVm2tD0erQ5B.png' },
    { id: 'av-denji', name: 'Denji (Chainsaw Man)', anime: 'Chainsaw Man', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-denji.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b130102-FO1VHNnEnLlB.png' },
    { id: 'av-shigeo-kageyama', name: 'Shigeo Kageyama (Mob)', anime: 'Mob Psycho 100', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-shigeo-kageyama.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89616-dXmdOc7L6SDi.png' },
    { id: 'av-ken-kaneki', name: 'Ken Kaneki (Ghoul)', anime: 'Tokyo Ghoul', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-ken-kaneki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b87275-mb13EWZBdbh3.png' },
    { id: 'av-thorfinn-karlsefni', name: 'Thorfinn Karlsefni', anime: 'Vinland Saga', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-thorfinn-karlsefni.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b10138-zOPrka0ddZOR.png' },
    { id: 'av-violet-evergarden', name: 'Violet Evergarden', anime: 'Violet Evergarden', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-violet-evergarden.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b90169-4wr1Zehnsac8.png' },
    { id: 'av-edward-elric', name: 'Edward Elric (Fullmetal)', anime: 'Fullmetal Alchemist', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-edward-elric.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b11-TA5Nuk7EDUZG.jpg' },
    { id: 'av-gon-freecss', name: 'Gon Freecss', anime: 'Hunter x Hunter', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-gon-freecss.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b30-lyFExKyDhefc.jpg' },
    { id: 'av-izuku-midoriya', name: 'Izuku Midoriya (Deku)', anime: 'My Hero Academia', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-izuku-midoriya.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89028-8w1I9o1ISHMg.png' },
    { id: 'av-kurisu-makise', name: 'Kurisu Makise', anime: 'Steins;Gate', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-kurisu-makise.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b34470-Jw2LXZBL5R8i.png' },
    { id: 'av-rintarou-okabe', name: 'Rintarou Okabe', anime: 'Steins;Gate', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-rintarou-okabe.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b35252-DY9TW6pusqeh.png' },
    { id: 'av-frieren', name: 'Frieren', anime: 'Frieren', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-frieren.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png' },
    { id: 'av-guts', name: 'Guts (Black Swordsman)', anime: 'Berserk', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-guts.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b422-XTaiTuvRohsV.png' },
    { id: 'av-levi', name: 'Levi Ackerman', anime: 'Attack on Titan', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-levi.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png' },
    { id: 'av-kakashi-hatake', name: 'Kakashi Hatake', anime: 'Naruto', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-kakashi-hatake.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b85-mkVBh2yjxjmx.png' },
    { id: 'av-satoru-gojou', name: 'Satoru Gojou', anime: 'JUJUTSU KAISEN', levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-satoru-gojou.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png' },

    // Level 50: Hokage / Shadow Monarch / God tier (Supreme Protagonists & Overpowered Legends)
    { id: 'av-luffy-monkey', name: 'Luffy Monkey (Gear 5)', anime: 'ONE PIECE', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-luffy-monkey.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png' },
    { id: 'av-naruto-uzumaki', name: 'Naruto Uzumaki (Hokage)', anime: 'Naruto', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-naruto-uzumaki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-phjcWCkRuIhu.png' },
    { id: 'av-gokuu-son', name: 'Son Goku (Ultra Instinct)', anime: 'Dragon Ball Z', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-gokuu-son.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/246-wsRRr6z1kii8.png' },
    { id: 'av-eren-yeager', name: 'Eren Yeager (Founding Titan)', anime: 'Attack on Titan', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-eren-yeager.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg' },
    { id: 'av-ichigo-kurosaki', name: 'Ichigo Kurosaki (Bankai)', anime: 'Bleach', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-ichigo-kurosaki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b5-a7bkJgjhhigE.png' },
    { id: 'av-jin-u-seong', name: 'Jin-U Seong (Shadow Monarch)', anime: 'Solo Leveling', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-jin-u-seong.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b129928-BCEjVaP0AQSw.png' },
    { id: 'av-saitama', name: 'Saitama (Serious Punch)', anime: 'One-Punch Man', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-saitama.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b73935-ON5d0mAcrItd.jpg' },
    { id: 'av-sukuna', name: 'Ryomen Sukuna (King of Curses)', anime: 'JUJUTSU KAISEN', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-sukuna.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b133701-rCQuDpHr3UZL.png' },
    { id: 'av-itachi-uchiha', name: 'Itachi Uchiha', anime: 'Naruto', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-itachi-uchiha.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b14-9Kb1E5oel1ke.png' },
    { id: 'av-light-yagami', name: 'Light Yagami (Kira)', anime: 'Death Note', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-light-yagami.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b80-26EhwSsSqQ50.png' },
    { id: 'av-l-lawliet', name: 'L Lawliet', anime: 'Death Note', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-l-lawliet.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-1W4panC53vfs.png' },
    { id: 'av-lelouch-lamperouge', name: 'Lelouch Lamperouge (Zero)', anime: 'Code Geass', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-lelouch-lamperouge.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b417-gVLmIJu9phcK.png' },
    { id: 'av-vegeta', name: 'Vegeta (Prince of Saiyans)', anime: 'Dragon Ball Z', levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-vegeta.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b913-NIFkKazWM8VO.png' },

    // --- EXPANDED ANIME LEGENDS (Level 1 to 50) ---

    // Level 1: Starter Expansion (14 Additional Characters)
    { id: 'av-sakura-matou', name: "Sakura Matou", anime: "Fate/Zero", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-sakura-matou.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b500-NQrLbnBr1sDv.png' },
    { id: 'av-marin-kitagawa', name: "Marin Kitagawa", anime: "My Dress-Up Darling", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-marin-kitagawa.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b133676-kV2czE3C8Qls.png' },
    { id: 'av-joseph-joestar', name: "Joseph Joestar", anime: "JoJo's Bizarre Adventure (TV)", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-joseph-joestar.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b6356-RImEfUfHpC58.png' },
    { id: 'av-megumin', name: "Megumin", anime: "KONOSUBA -God's blessing on this wonderful world!", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-megumin.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89361-tq8PQQ4MmF0M.png' },
    { id: 'av-askeladd', name: "Askeladd", anime: "Vinland Saga", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-askeladd.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b13020-ZdiYlNmpRUNS.png' },
    { id: 'av-rem', name: "Rem", anime: "Re:ZERO -Starting Life in Another World-", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-rem.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png' },
    { id: 'av-osamu-dazai', name: "Osamu Dazai", anime: "Bungo Stray Dogs", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-osamu-dazai.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89198-qKmRTw4Y3PRC.png' },
    { id: 'av-chika-fujiwara', name: "Chika Fujiwara", anime: "Kaguya-sama: Love is War", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-chika-fujiwara.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b121103-UGLxT8utLPnq.png' },
    { id: 'av-itsuki-nakano', name: "Itsuki Nakano", anime: "The Quintessential Quintuplets", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-itsuki-nakano.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b126375-dEe9IyQ9By09.png' },
    { id: 'av-gintoki-sakata', name: "Gintoki Sakata", anime: "Gintama", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-gintoki-sakata.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b672-cP5VPriN67xJ.png' },
    { id: 'av-ichigo', name: "Ichigo", anime: "DARLING in the FRANXX", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-ichigo.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b124382-bSBkjtYjJQtr.png' },
    { id: 'av-subaru-natsuki', name: "Subaru Natsuki", anime: "Re:ZERO -Starting Life in Another World-", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-subaru-natsuki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b88573-F8yMTK9GhnTA.png' },
    { id: 'av-kiyotaka-ayanokouji', name: "Kiyotaka Ayanokouji", anime: "Classroom of the Elite", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-kiyotaka-ayanokouji.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b123212-ewZgUQr9vvEM.png' },
    { id: 'av-senkuu-ishigami', name: "Senkuu Ishigami", anime: "Dr. STONE", levelReq: 1, tier: 'Starter', url: 'assets/avatars/av-senkuu-ishigami.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b124142-XUO1g7wRqkaT.png' },

    // Level 5: Genin Expansion (14 Additional Characters)
    { id: 'av-sanji', name: "Sanji", anime: "ONE PIECE", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-sanji.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b305-6lisPmHtCnLT.png' },
    { id: 'av-miko-iino', name: "Miko Iino", anime: "Kaguya-sama: Love is War", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-miko-iino.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b125886-TQbmqAaSgBLS.png' },
    { id: 'av-zero-two', name: "Zero Two", anime: "DARLING in the FRANXX", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-zero-two.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b124381-2gAVq76HPfL2.png' },
    { id: 'av-kusuo-saiki', name: "Kusuo Saiki", anime: "Assassination Classroom Second Season", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-kusuo-saiki.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b90107-ZULW5HlPX1uU.png' },
    { id: 'av-robin-nico', name: "Robin Nico", anime: "ONE PIECE", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-robin-nico.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b61-ywXUyyocEEqt.png' },
    { id: 'av-izumi-miyamura', name: "Izumi Miyamura", anime: "Horimiya", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-izumi-miyamura.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b66173-g8eU1LGWPB8O.png' },
    { id: 'av-hitagi-senjougahara', name: "Hitagi Senjougahara", anime: "Bakemonogatari", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-hitagi-senjougahara.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b22037-sY7GWSKYr2Nl.jpg' },
    { id: 'av-shouyou-hinata', name: "Shouyou Hinata", anime: "HAIKYU!!", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-shouyou-hinata.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b64769-WoWlCMLLgJ14.png' },
    { id: 'av-asuka-langley-souryuu', name: "Asuka Langley Souryuu", anime: "Neon Genesis Evangelion", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-asuka-langley-souryuu.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b94-d631a3Z2KPvd.png' },
    { id: 'av-aki-hayakawa', name: "Aki Hayakawa", anime: "Chainsaw Man", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-aki-hayakawa.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b137081-TSrUR3mUJL6r.png' },
    { id: 'av-yuu-ishigami', name: "Yuu Ishigami", anime: "Kaguya-sama: Love is War", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-yuu-ishigami.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b121102-tiQFxnSEIAwm.png' },
    { id: 'av-spike-spiegel', name: "Spike Spiegel", anime: "Cowboy Bebop", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-spike-spiegel.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b1-ChxaldmieFlQ.png' },
    { id: 'av-joutarou-kuujou', name: "Joutarou Kuujou", anime: "JoJo's Bizarre Adventure (TV)", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-joutarou-kuujou.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b4003-gWDSEGbeOAll.png' },
    { id: 'av-hange-zoe', name: "Hange Zoe", anime: "Attack on Titan", levelReq: 5, tier: 'Genin', url: 'assets/avatars/av-hange-zoe.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b71121-7R7CnQd3lHgt.png' },

    // Level 15: Chunin Expansion (14 Additional Characters)
    { id: 'av-shinobu-oshino', name: "Shinobu Oshino", anime: "Bakemonogatari", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-shinobu-oshino.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b23602-Z4MDNYcoAWZu.png' },
    { id: 'av-rimuru-tempest', name: "Rimuru Tempest", anime: "That Time I Got Reincarnated as a Slime", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-rimuru-tempest.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b123962-eL9yGV0NLMF7.png' },
    { id: 'av-kento-nanami', name: "Kento Nanami", anime: "JUJUTSU KAISEN", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-kento-nanami.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b133704-8wLTGjc234q2.png' },
    { id: 'av-maki-zenin', name: "Maki Zenin", anime: "JUJUTSU KAISEN", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-maki-zenin.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b134167-5TCytk45YByD.png' },
    { id: 'av-erwin-smith', name: "Erwin Smith", anime: "Attack on Titan", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-erwin-smith.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b46496-Mu86MENd5wNB.png' },
    { id: 'av-yato', name: "Yato", anime: "Noragami", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-yato.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b84677-PFmohzIXD1ud.png' },
    { id: 'av-rin-toosaka', name: "Rin Toosaka", anime: "Fate/Zero", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-rin-toosaka.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b498-lwawtSpLyATL.png' },
    { id: 'av-tobio-kageyama', name: "Tobio Kageyama", anime: "HAIKYU!!", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-tobio-kageyama.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b64771-BuCVs7B8bBdh.png' },
    { id: 'av-hachiman-hikigaya', name: "Hachiman Hikigaya", anime: "My Teen Romantic Comedy SNAFU", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-hachiman-hikigaya.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b67065-Dhec6tE2yWA9.png' },
    { id: 'av-giyuu-tomioka', name: "Giyuu Tomioka", anime: "Demon Slayer: Kimetsu no Yaiba", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-giyuu-tomioka.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b130050-qsLThJs5VIbz.png' },
    { id: 'av-koyomi-araragi', name: "Koyomi Araragi", anime: "Bakemonogatari", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-koyomi-araragi.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b22036-Ed3CjwPlDLp4.png' },
    { id: 'av-hitori-gotou', name: "Hitori Gotou", anime: "BOCCHI THE ROCK!", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-hitori-gotou.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b257562-Ru35NYPfsqhY.png' },
    { id: 'av-homura-akemi', name: "Homura Akemi", anime: "Puella Magi Madoka Magica", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-homura-akemi.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b38005-T3NR8p2f021x.jpg' },
    { id: 'av-artoria-pendragon', name: "Artoria Pendragon", anime: "Fate/Zero", levelReq: 15, tier: 'Chunin', url: 'assets/avatars/av-artoria-pendragon.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b497-Yg5pNmC8kxzs.png' },

    // Level 25: Jounin Expansion (14 Additional Characters)
    { id: 'av-miku-nakano', name: "Miku Nakano", anime: "The Quintessential Quintuplets", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-miku-nakano.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b126373-CWeyXb822uDN.png' },
    { id: 'av-kyouko-hori', name: "Kyouko Hori", anime: "Horimiya", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-kyouko-hori.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b66171-o2vk3689wWFK.png' },
    { id: 'av-kana-arima', name: "Kana Arima", anime: "OSHI NO KO", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-kana-arima.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b188783-77orwP7vNuNg.png' },
    { id: 'av-yuuta-okkotsu', name: "Yuuta Okkotsu", anime: "JUJUTSU KAISEN", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-yuuta-okkotsu.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b129571-GHJk7gviHOOw.jpg' },
    { id: 'av-shouko-nishimiya', name: "Shouko Nishimiya", anime: "A Silent Voice", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-shouko-nishimiya.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b80243-RzxE51iUU5eq.png' },
    { id: 'av-rei-ayanami', name: "Rei Ayanami", anime: "Neon Genesis Evangelion", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-rei-ayanami.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/86-cA1zL7fyls8E.jpg' },
    { id: 'av-roxy-migurdia', name: "Roxy Migurdia", anime: "Mushoku Tensei: Jobless Reincarnation", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-roxy-migurdia.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b88350-QU1iwgZ887U8.png' },
    { id: 'av-kyoujurou-rengoku', name: "Kyoujurou Rengoku", anime: "Demon Slayer: Kimetsu no Yaiba", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-kyoujurou-rengoku.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b129133-VlTPowwt68rJ.png' },
    { id: 'av-shinji-ikari', name: "Shinji Ikari", anime: "Neon Genesis Evangelion", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-shinji-ikari.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b89-ZtZhXkh1rITn.png' },
    { id: 'av-johan-liebert', name: "Johan Liebert", anime: "Monster", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-johan-liebert.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b719-y984mDWyGf5n.jpg' },
    { id: 'av-misato-katsuragi', name: "Misato Katsuragi", anime: "Neon Genesis Evangelion", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-misato-katsuragi.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b1259-afTQkZ5SVMOn.png' },
    { id: 'av-c-c', name: "C.C.", anime: "Code Geass: Lelouch of the Rebellion", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-c-c.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b1111-UhmlFtRFrnWa.png' },
    { id: 'av-nino-nakano', name: "Nino Nakano", anime: "The Quintessential Quintuplets", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-nino-nakano.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b126372-DtorHRgQaYUJ.png' },
    { id: 'av-yami-sukehiro', name: "Yami Sukehiro", anime: "Black Clover", levelReq: 25, tier: 'Jounin', url: 'assets/avatars/av-yami-sukehiro.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b124440-Lpdo6y8cljV6.png' },

    // Level 50: Monarch Expansion (9 Additional Characters)
    { id: 'av-ai-hayasaka', name: "Ai Hayasaka", anime: "Kaguya-sama: Love is War", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-ai-hayasaka.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b121104-7TYRl3EEsDYU.png' },
    { id: 'av-shouya-ishida', name: "Shouya Ishida", anime: "A Silent Voice", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-shouya-ishida.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b80491-NK6pxb6oH61P.png' },
    { id: 'av-yuu-nishinoya', name: "Yuu Nishinoya", anime: "HAIKYU!!", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-yuu-nishinoya.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b67327-zQb1dlC7joPb.jpg' },
    { id: 'av-sakuta-azusagawa', name: "Sakuta Azusagawa", anime: "Rascal Does Not Dream of Bunny Girl Senpai", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-sakuta-azusagawa.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/n127221-Wxg4xFtW4kaJ.png' },
    { id: 'av-karma-akabane', name: "Karma Akabane", anime: "Assassination Classroom", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-karma-akabane.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b71933-HQ1TSjlrJ8Hv.jpg' },
    { id: 'av-kyou-souma', name: "Kyou Souma", anime: "Fruits Basket (2019)", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-kyou-souma.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b209-NOAbiLvJt1QA.png' },
    { id: 'av-reze', name: "Reze", anime: "Chainsaw Man", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-reze.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b148740-ceAibPxLW8rR.png' },
    { id: 'av-law-trafalgar', name: "Law Trafalgar", anime: "ONE PIECE", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-law-trafalgar.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b13767-U604OJN9dxCn.jpg' },
    { id: 'av-nami', name: "Nami", anime: "ONE PIECE", levelReq: 50, tier: 'Monarch', url: 'assets/avatars/av-nami.png', fallback: 'https://s4.anilist.co/file/anilistcdn/character/large/b723-vp5hPptgnNEC.png' }
  ];

  // Preset Anime Widescreen Posters & Banners (20 Ultra-HD Backgrounds with Level Requirements)
  const BANNER_PRESETS = [

    // Level 1: Starter Posters
    { id: 'ban-naruto', name: 'Naruto Shippuden: Hidden Leaf', anime: 'Naruto', levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-naruto.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1735.jpg' },
    { id: 'ban-one-piece', name: 'One Piece: Gear 5 & Wano', anime: 'One Piece', levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-one-piece.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg' },
    { id: 'ban-your-name', name: 'Your Name: Twilight Starfall', anime: 'Your Name', levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-your-name.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21519-1ayMXgNlmByb.jpg' },
    { id: 'ban-spy-family', name: 'Spy x Family: Operation Strix', anime: 'Spy x Family', levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-spy-family.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/140960-Z7xSvkRxHKfj.jpg' },

    // Level 5: Genin Posters
    { id: 'ban-demon-slayer', name: 'Demon Slayer: Hashira Training', anime: 'Demon Slayer', levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-demon-slayer.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg' },
    { id: 'ban-jjk', name: 'Jujutsu Kaisen: Shibuya Arc', anime: 'Jujutsu Kaisen', levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-jjk.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg' },
    { id: 'ban-mob-psycho', name: 'Mob Psycho 100: Explosion', anime: 'Mob Psycho 100', levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-mob-psycho.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21507-Qx8bGsLXUgLo.jpg' },

    // Level 15: Chunin Posters
    { id: 'ban-aot', name: 'Attack on Titan: The Final War', anime: 'Attack on Titan', levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-aot.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg' },
    { id: 'ban-hxh', name: 'Hunter x Hunter: Chimera Ant', anime: 'Hunter x Hunter', levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-hxh.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/11061-8WkkTZ6duKpq.jpg' },
    { id: 'ban-chainsaw-man', name: 'Chainsaw Man: Devil Hunters', anime: 'Chainsaw Man', levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-chainsaw-man.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/127230-o8IRwCGVr9KW.jpg' },
    { id: 'ban-vinland', name: 'Vinland Saga: Path of Peace', anime: 'Vinland Saga', levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-vinland.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101348-pivKKffCAwAY.jpg' },

    // Level 25: Jounin Posters
    { id: 'ban-bleach', name: 'Bleach: Thousand-Year Blood War', anime: 'Bleach', levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-bleach.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/269-08ar2HJOUAuL.jpg' },
    { id: 'ban-cyberpunk', name: 'Cyberpunk: Edgerunners Moon', anime: 'Cyberpunk', levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-cyberpunk.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/120377-c15oLS8CA31s.jpg' },
    { id: 'ban-fmab', name: 'Fullmetal Alchemist: Gate of Truth', anime: 'Fullmetal Alchemist', levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-fmab.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/5114-q0V5URebphSG.jpg' },
    { id: 'ban-frieren', name: 'Frieren: Beyond Journey’s End', anime: 'Frieren', levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-frieren.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg' },

    // Level 50: Monarch Posters
    { id: 'ban-solo-leveling', name: 'Solo Leveling: Shadow Monarch', anime: 'Solo Leveling', levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-solo-leveling.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg' },
    { id: 'ban-dragonball', name: 'Dragon Ball Super: Tournament', anime: 'Dragon Ball Super', levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-dragonball.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21175-Qo9gdGPUm4Im.jpg' },
    { id: 'ban-death-note', name: 'Death Note: Battle of Minds', anime: 'Death Note', levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-death-note.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg' },
    { id: 'ban-steins-gate', name: 'Steins;Gate: World Line Convergence', anime: 'Steins;Gate', levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-steins-gate.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/n9253-JIhmKgBKsWUN.jpg' },
    { id: 'ban-evangelion', name: 'Neon Genesis Evangelion: Third Impact', anime: 'Evangelion', levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-evangelion.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/30-gEMoHHIqxDgN.jpg' },

    // --- EXPANDED HD WIDESCREEN POSTERS (Level 1 to 50) ---

    // Level 1: Starter Expansion (12 Additional Banners)
    { id: 'ban-attack-on-titan', name: "Attack on Titan: Widescreen Showcase", anime: "Attack on Titan", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-attack-on-titan.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg' },
    { id: 'ban-demon-slayer-kimetsu-no-yaiba', name: "Demon Slayer: Kimetsu no Yaiba: Widescreen Showcase", anime: "Demon Slayer: Kimetsu no Yaiba", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-demon-slayer-kimetsu-no-yaiba.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg' },
    { id: 'ban-jujutsu-kaisen', name: "JUJUTSU KAISEN: Widescreen Showcase", anime: "JUJUTSU KAISEN", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-jujutsu-kaisen.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg' },
    { id: 'ban-my-hero-academia', name: "My Hero Academia: Widescreen Showcase", anime: "My Hero Academia", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-my-hero-academia.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg' },
    { id: 'ban-hunter-x-hunter-2011', name: "Hunter x Hunter (2011): Widescreen Showcase", anime: "Hunter x Hunter (2011)", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-hunter-x-hunter-2011.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/11061-8WkkTZ6duKpq.jpg' },
    { id: 'ban-one-punch-man', name: "One-Punch Man: Widescreen Showcase", anime: "One-Punch Man", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-one-punch-man.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21087-sHb9zUZFsHe1.jpg' },
    { id: 'ban-tokyo-ghoul', name: "Tokyo Ghoul: Widescreen Showcase", anime: "Tokyo Ghoul", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-tokyo-ghoul.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20605-RCJ7M71zLmrh.jpg' },
    { id: 'ban-attack-on-titan-season-2', name: "Attack on Titan Season 2: Widescreen Showcase", anime: "Attack on Titan Season 2", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-attack-on-titan-season-2.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20958-Y7eQdz9VENBD.jpg' },
    { id: 'ban-fullmetal-alchemist-brotherhood', name: "Fullmetal Alchemist: Brotherhood: Widescreen Showcase", anime: "Fullmetal Alchemist: Brotherhood", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-fullmetal-alchemist-brotherhood.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/5114-q0V5URebphSG.jpg' },
    { id: 'ban-sword-art-online', name: "Sword Art Online: Widescreen Showcase", anime: "Sword Art Online", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-sword-art-online.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/11757-TlEEV9weG4Ag.jpg' },
    { id: 'ban-a-silent-voice', name: "A Silent Voice: Widescreen Showcase", anime: "A Silent Voice", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-a-silent-voice.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20954-f30bHMXa5Qoe.jpg' },
    { id: 'ban-attack-on-titan-season-3', name: "Attack on Titan Season 3: Widescreen Showcase", anime: "Attack on Titan Season 3", levelReq: 1, tier: 'Starter', url: 'assets/banners/ban-attack-on-titan-season-3.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99147-HACsFVrynFf5.jpg' },

    // Level 5: Genin Expansion (14 Additional Banners)
    { id: 'ban-my-hero-academia-season-2', name: "My Hero Academia Season 2: Widescreen Showcase", anime: "My Hero Academia Season 2", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-my-hero-academia-season-2.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21856-wtSHgeHFmzdG.jpg' },
    { id: 'ban-attack-on-titan-final-season', name: "Attack on Titan Final Season: Widescreen Showcase", anime: "Attack on Titan Final Season", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-attack-on-titan-final-season.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/110277-iuGn6F5bK1U1.jpg' },
    { id: 'ban-the-promised-neverland', name: "The Promised Neverland: Widescreen Showcase", anime: "The Promised Neverland", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-the-promised-neverland.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101759-MhlCoeqnODso.jpg' },
    { id: 'ban-assassination-classroom', name: "Assassination Classroom: Widescreen Showcase", anime: "Assassination Classroom", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-assassination-classroom.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20755-D4ipww9U8YkC.jpg' },
    { id: 'ban-mob-psycho-100', name: "Mob Psycho 100: Widescreen Showcase", anime: "Mob Psycho 100", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-mob-psycho-100.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21507-Qx8bGsLXUgLo.jpg' },
    { id: 'ban-re-zero-starting-life-in-another-world', name: "Re:ZERO -Starting Life in Another World-: Widescreen Showcase", anime: "Re:ZERO -Starting Life in Another World-", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-re-zero-starting-life-in-another-world.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21355-f9SjOfEJMk5P.jpg' },
    { id: 'ban-your-lie-in-april', name: "Your lie in April: Widescreen Showcase", anime: "Your lie in April", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-your-lie-in-april.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20665-j4kSsfhfkM24.jpg' },
    { id: 'ban-attack-on-titan-season-3-part-2', name: "Attack on Titan Season 3 Part 2: Widescreen Showcase", anime: "Attack on Titan Season 3 Part 2", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-attack-on-titan-season-3-part-2.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/104578-z7SadpYEuAsy.jpg' },
    { id: 'ban-naruto-shippuden', name: "Naruto: Shippuden: Widescreen Showcase", anime: "Naruto: Shippuden", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-naruto-shippuden.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1735.jpg' },
    { id: 'ban-erased', name: "ERASED: Widescreen Showcase", anime: "ERASED", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-erased.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21234-7lfSSPoMmwr2.jpg' },
    { id: 'ban-my-hero-academia-season-3', name: "My Hero Academia Season 3: Widescreen Showcase", anime: "My Hero Academia Season 3", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-my-hero-academia-season-3.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/100166-k7RXwN5vZg0r.jpg' },
    { id: 'ban-black-clover', name: "Black Clover: Widescreen Showcase", anime: "Black Clover", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-black-clover.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97940-1URQdQ4U1a0b.jpg' },
    { id: 'ban-haikyu', name: "HAIKYU!!: Widescreen Showcase", anime: "HAIKYU!!", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-haikyu.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20464-PpYjO9cPN1gs.jpg' },
    { id: 'ban-rascal-does-not-dream-of-bunny-girl-senpai', name: "Rascal Does Not Dream of Bunny Girl Senpai: Widescreen Showcase", anime: "Rascal Does Not Dream of Bunny Girl Senpai", levelReq: 5, tier: 'Genin', url: 'assets/banners/ban-rascal-does-not-dream-of-bunny-girl-senpai.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/n101291-fqIUvQ6apEtD.jpg' },

    // Level 15: Chunin Expansion (14 Additional Banners)
    { id: 'ban-spy-x-family', name: "SPY x FAMILY: Widescreen Showcase", anime: "SPY x FAMILY", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-spy-x-family.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/140960-Z7xSvkRxHKfj.jpg' },
    { id: 'ban-kaguya-sama-love-is-war', name: "Kaguya-sama: Love is War: Widescreen Showcase", anime: "Kaguya-sama: Love is War", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-kaguya-sama-love-is-war.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101921-GgvvFhlNhzlF.jpg' },
    { id: 'ban-dr-stone', name: "Dr. STONE: Widescreen Showcase", anime: "Dr. STONE", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-dr-stone.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/105333-KWKGvBM8Hyga.jpg' },
    { id: 'ban-vinland-saga', name: "Vinland Saga: Widescreen Showcase", anime: "Vinland Saga", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-vinland-saga.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101348-pivKKffCAwAY.jpg' },
    { id: 'ban-violet-evergarden', name: "Violet Evergarden: Widescreen Showcase", anime: "Violet Evergarden", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-violet-evergarden.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21827-ROucgYiiiSpR.jpg' },
    { id: 'ban-horimiya', name: "Horimiya: Widescreen Showcase", anime: "Horimiya", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-horimiya.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/124080-ARyLAHHgikRq.jpg' },
    { id: 'ban-toradora', name: "Toradora!: Widescreen Showcase", anime: "Toradora!", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-toradora.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/4224-iPUOHdMde27j.jpg' },
    { id: 'ban-no-game-no-life', name: "No Game, No Life: Widescreen Showcase", anime: "No Game, No Life", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-no-game-no-life.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/19815-BqbuD0wyBS3P.jpg' },
    { id: 'ban-akame-ga-kill', name: "Akame ga Kill!: Widescreen Showcase", anime: "Akame ga Kill!", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-akame-ga-kill.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20613-CoEQF4qKiWDX.jpg' },
    { id: 'ban-noragami', name: "Noragami: Widescreen Showcase", anime: "Noragami", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-noragami.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20447-nlgQQzcgWbgw.jpg' },
    { id: 'ban-my-hero-academia-season-4', name: "My Hero Academia Season 4: Widescreen Showcase", anime: "My Hero Academia Season 4", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-my-hero-academia-season-4.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/104276-PQO1pcNzzWT0.jpg' },
    { id: 'ban-the-seven-deadly-sins', name: "The Seven Deadly Sins: Widescreen Showcase", anime: "The Seven Deadly Sins", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-the-seven-deadly-sins.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20789-qwG9GcxIrmVE.jpg' },
    { id: 'ban-konosuba-god-s-blessing-on-this-wonderful-world', name: "KONOSUBA -God's blessing on this wonderful world!: Widescreen Showcase", anime: "KONOSUBA -God's blessing on this wonderful world!", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-konosuba-god-s-blessing-on-this-wonderful-world.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21202-UWijdV7RMnXo.jpg' },
    { id: 'ban-demon-slayer-kimetsu-no-yaiba-the-movie-mugen-train', name: "Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train: Widescreen Showcase", anime: "Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train", levelReq: 15, tier: 'Chunin', url: 'assets/banners/ban-demon-slayer-kimetsu-no-yaiba-the-movie-mugen-train.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/112151-eHCBz19nf2yC.jpg' },

    // Level 25: Jounin Expansion (10 Additional Banners)
    { id: 'ban-code-geass-lelouch-of-the-rebellion', name: "Code Geass: Lelouch of the Rebellion: Widescreen Showcase", anime: "Code Geass: Lelouch of the Rebellion", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-code-geass-lelouch-of-the-rebellion.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1575.jpg' },
    { id: 'ban-darling-in-the-franxx', name: "DARLING in the FRANXX: Widescreen Showcase", anime: "DARLING in the FRANXX", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-darling-in-the-franxx.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99423-OQfem628gdxD.jpg' },
    { id: 'ban-parasyte-the-maxim', name: "Parasyte -the maxim-: Widescreen Showcase", anime: "Parasyte -the maxim-", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-parasyte-the-maxim.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20623-xb9PPf8rGOsG.jpg' },
    { id: 'ban-neon-genesis-evangelion', name: "Neon Genesis Evangelion: Widescreen Showcase", anime: "Neon Genesis Evangelion", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-neon-genesis-evangelion.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/30-gEMoHHIqxDgN.jpg' },
    { id: 'ban-jujutsu-kaisen-season-2', name: "JUJUTSU KAISEN Season 2: Widescreen Showcase", anime: "JUJUTSU KAISEN Season 2", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-jujutsu-kaisen-season-2.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/145064-esDtAY2He7sk.jpg' },
    { id: 'ban-frieren-beyond-journey-s-end', name: "Frieren: Beyond Journey’s End: Widescreen Showcase", anime: "Frieren: Beyond Journey’s End", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-frieren-beyond-journey-s-end.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg' },
    { id: 'ban-demon-slayer-kimetsu-no-yaiba-entertainment-district-arc', name: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc: Widescreen Showcase", anime: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-demon-slayer-kimetsu-no-yaiba-entertainment-district-arc.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/142329-i413SzLmToZN.jpg' },
    { id: 'ban-fire-force', name: "Fire Force: Widescreen Showcase", anime: "Fire Force", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-fire-force.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/105310-ygGL9yweZM2Q.jpg' },
    { id: 'ban-spirited-away', name: "Spirited Away: Widescreen Showcase", anime: "Spirited Away", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-spirited-away.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-Sm2RU5PSqw7T.jpg' },
    { id: 'ban-jojo-s-bizarre-adventure-tv', name: "JoJo's Bizarre Adventure (TV): Widescreen Showcase", anime: "JoJo's Bizarre Adventure (TV)", levelReq: 25, tier: 'Jounin', url: 'assets/banners/ban-jojo-s-bizarre-adventure-tv.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/14719-m7Hv2AxcNNjM.jpg' },

    // Level 50: Monarch Expansion (6 Additional Banners)
    { id: 'ban-cowboy-bebop', name: "Cowboy Bebop: Widescreen Showcase", anime: "Cowboy Bebop", levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-cowboy-bebop.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1-OquNCNB6srGe.jpg' },
    { id: 'ban-one-punch-man-season-2', name: "One-Punch Man Season 2: Widescreen Showcase", anime: "One-Punch Man Season 2", levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-one-punch-man-season-2.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97668-8Yo3iH2fxbKR.jpg' },
    { id: 'ban-death-parade', name: "Death Parade: Widescreen Showcase", anime: "Death Parade", levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-death-parade.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20931-xDhiTPZmtS3u.jpg' },
    { id: 'ban-that-time-i-got-reincarnated-as-a-slime', name: "That Time I Got Reincarnated as a Slime: Widescreen Showcase", anime: "That Time I Got Reincarnated as a Slime", levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-that-time-i-got-reincarnated-as-a-slime.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101280-9t7J3774n955.jpg' },
    { id: 'ban-mushoku-tensei-jobless-reincarnation', name: "Mushoku Tensei: Jobless Reincarnation: Widescreen Showcase", anime: "Mushoku Tensei: Jobless Reincarnation", levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-mushoku-tensei-jobless-reincarnation.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/108465-RgsRpTMhP9Sv.jpg' },
    { id: 'ban-the-rising-of-the-shield-hero', name: "The Rising of the Shield Hero: Widescreen Showcase", anime: "The Rising of the Shield Hero", levelReq: 50, tier: 'Monarch', url: 'assets/banners/ban-the-rising-of-the-shield-hero.jpg', fallback: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99263-IwkmdCTsDY1t.jpg' }
  ];

  AVATAR_PRESETS.forEach(a => { if (a && a.url && !a.url.startsWith('/')) a.url = '/' + a.url; });
  BANNER_PRESETS.forEach(b => { if (b && b.url && !b.url.startsWith('/')) b.url = '/' + b.url; });

  // Preset Aura Frames with Level Requirements
  const AURA_PRESETS = [
    { id: 'default', name: 'Neon Glow', levelReq: 1, tier: 'Starter' },
    { id: 'sakura', name: 'Sakura Petals', levelReq: 5, tier: 'Genin' },
    { id: 'electric', name: 'Thunder Sparks', levelReq: 10, tier: 'Chunin' },
    { id: 'fire', name: 'Nine-Tails Flame', levelReq: 15, tier: 'Chunin' },
    { id: 'purple', name: 'Domain Void', levelReq: 25, tier: 'Jounin' },
    { id: 'gold', name: 'Super Saiyan God', levelReq: 50, tier: 'Monarch' }
  ];

  // Accent Colors
  const ACCENT_COLORS = [
    { name: 'Crimson Flame', hex: '#ff0055', glow: 'rgba(255, 0, 85, 0.4)' },
    { name: 'Cyber Cyan', hex: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)' },
    { name: 'Domain Purple', hex: '#b800ff', glow: 'rgba(184, 0, 255, 0.4)' },
    { name: 'Super Saiyan Gold', hex: '#ffb700', glow: 'rgba(255, 183, 0, 0.4)' },
    { name: 'Toxic Emerald', hex: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)' }
  ];

  function getToken() {
    return localStorage.getItem('infinx_token');
  }

  function showToast(msg) {
    let toast = document.getElementById('profileToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'profileToast';
      toast.className = 'profile-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--cyan-neon);"></i> <span>${msg}</span>`;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  function getRankBadgeConfig(rank) {
    const r = (rank || 'GENIN').toUpperCase();
    if (r === 'HOKAGE_VIP' || r === 'HOKAGE') {
      return { label: '👑 HOKAGE VIP', class: 'hokage', icon: 'fa-crown' };
    }
    if (r === 'HASHIRA') {
      return { label: '⚔️ HASHIRA', class: 'hashira', icon: 'fa-khanda' };
    }
    if (r === 'MODERATOR') {
      return { label: '🛡️ MODERATOR', class: 'mod', icon: 'fa-shield-alt' };
    }
    if (r === 'JOUNIN') {
      return { label: '🔥 JOUNIN', class: 'jounin', icon: 'fa-fire' };
    }
    if (r === 'CHUNIN') {
      return { label: '⚡ CHUNIN', class: 'chunin', icon: 'fa-bolt' };
    }
    return { label: '🌱 GENIN', class: 'genin', icon: 'fa-leaf' };
  }

  function applyAccentColor(hex) {
    const found = ACCENT_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase()) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--user-accent', found.hex);
    document.documentElement.style.setProperty('--user-accent-glow', found.glow);
  }

  function persistUserProfileToStorage(p) {
    if (!p) return;
    try {
      localStorage.setItem('infinx_user', JSON.stringify(p));
      if (p.username) localStorage.setItem('infinx_username', p.username);
      if (p.email) localStorage.setItem('infinx_user_email', p.email);
      if (p.role) localStorage.setItem('infinx_user_role', p.role);
      if (p.avatarUrl) localStorage.setItem('infinx_avatar', p.avatarUrl);
      if (p.avatarFrame) localStorage.setItem('infinx_avatar_frame', p.avatarFrame);
      if (p.accentColor) localStorage.setItem('infinx_accent_color', p.accentColor);
      if (p.vipRank) localStorage.setItem('infinx_vip_rank', p.vipRank);
      if (p.level) localStorage.setItem('infinx_level', String(p.level));
      window.dispatchEvent(new CustomEvent('infinx:profile_updated', { detail: p }));
    } catch (e) {
      console.warn('Storage sync failed:', e);
    }
  }

  let isCurrentProfileOwner = false;

  async function loadProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUser = urlParams.get('user') || urlParams.get('username') || urlParams.get('id');
    const token = getToken();

    // STRICT OWNER PRINCIPLE: The top navbar header ALWAYS represents the active logged-in user
    updateHeaderAuth();

    // Check if viewing another user's profile
    if (targetUser) {
      try {
        const res = await fetch(`${API_BASE}/user/profile/${encodeURIComponent(targetUser)}`);
        if (res.ok) {
          const targetProfile = await res.json();
          const currentEmail = localStorage.getItem('infinx_user_email');
          const currentUsername = localStorage.getItem('infinx_username');
          const isSelf = Boolean(
            token && (
              (currentUsername && targetProfile.username && currentUsername.trim().toLowerCase() === targetProfile.username.trim().toLowerCase()) ||
              (currentEmail && targetProfile.email && currentEmail.trim().toLowerCase() === targetProfile.email.trim().toLowerCase())
            )
          );

          isCurrentProfileOwner = isSelf;
          if (isSelf) {
            currentUserProfile = targetProfile;
            persistUserProfileToStorage(currentUserProfile);
          }
          renderProfileUI(targetProfile, !isSelf);
          return;
        }
      } catch (e) {
        console.warn('Target user profile not found, trying logged in user:', e);
      }
    }

    if (!token) {
      document.getElementById('profileLoadingState').style.display = 'none';
      document.getElementById('profileAuthRequired').style.display = 'block';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to load profile');
      }

      currentUserProfile = await res.json();
      isCurrentProfileOwner = true;
      persistUserProfileToStorage(currentUserProfile);
      renderProfileUI(currentUserProfile, false);
    } catch (e) {
      console.error(e);
      document.getElementById('profileLoadingState').style.display = 'none';
      document.getElementById('profileAuthRequired').style.display = 'block';
    }
  }

  function renderProfileUI(p, isViewingOtherUser = false) {
    document.getElementById('profileLoadingState').style.display = 'none';
    document.getElementById('profileMainContent').style.display = 'block';

    const isOwner = !isViewingOtherUser && isCurrentProfileOwner;

    // Toggle edit controls (STRICT OWNERSHIP: Only owner can see edit buttons or customize)
    const openBannerEditBtn = document.getElementById('openBannerEditBtn');
    const openEditProfileBtn = document.getElementById('openEditProfileBtn');
    const openShowcaseModalBtn = document.getElementById('openShowcaseModalBtn');
    const adminLinkBtn = document.getElementById('profileAdminLinkBtn');
    const showcaseSubtitle = document.querySelector('#hallOfFameSection .section-subtitle');
    const watchlistTabBtn = document.querySelector('.tab-btn[data-target="watchlist"]');

    if (!isOwner) {
      if (openBannerEditBtn) openBannerEditBtn.style.display = 'none';
      if (openEditProfileBtn) openEditProfileBtn.style.display = 'none';
      if (openShowcaseModalBtn) openShowcaseModalBtn.style.display = 'none';
      if (adminLinkBtn) adminLinkBtn.style.display = 'none';
      if (showcaseSubtitle) {
        showcaseSubtitle.innerText = `Showcasing @${p.username}'s verified completed anime achievements`;
      }
      if (watchlistTabBtn) {
        watchlistTabBtn.innerHTML = `<i class="fas fa-heart"></i> @${p.username}'s Watchlist`;
      }

      let viewingBadge = document.getElementById('viewingOtherUserBadge');
      if (!viewingBadge) {
        viewingBadge = document.createElement('div');
        viewingBadge.id = 'viewingOtherUserBadge';
        const cardHeader = document.querySelector('.profile-card');
        if (cardHeader) {
          cardHeader.insertBefore(viewingBadge, cardHeader.firstChild);
        }
      }
      viewingBadge.innerHTML = `
        <div style="background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 12px; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; color: #00f0ff; font-weight: 700; font-size: 1.3rem;">
            <i class="fas fa-eye"></i> Viewing @${p.username}'s Public Otaku Profile
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="index.html#publicLiveChatSection" style="background: rgba(255, 0, 85, 0.15); border: 1px solid rgba(255, 0, 85, 0.4); color: #fff; padding: 6px 14px; border-radius: 999px; text-decoration: none; font-size: 1.15rem; font-weight: 600;">
              <i class="fas fa-comments"></i> Return to Live Chat
            </a>
            <a href="profile.html" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 6px 14px; border-radius: 999px; text-decoration: none; font-size: 1.15rem; font-weight: 600;">
              <i class="fas fa-user"></i> My Profile
            </a>
          </div>
        </div>
      `;
    } else {
      const viewingBadge = document.getElementById('viewingOtherUserBadge');
      if (viewingBadge) viewingBadge.remove();
      if (openBannerEditBtn) openBannerEditBtn.style.display = 'inline-flex';
      if (openEditProfileBtn) openEditProfileBtn.style.display = 'inline-flex';
      if (openShowcaseModalBtn) openShowcaseModalBtn.style.display = 'inline-flex';
      if (showcaseSubtitle) {
        showcaseSubtitle.innerText = 'Showcasing your verified completed anime achievements';
      }
      if (watchlistTabBtn) {
        watchlistTabBtn.innerHTML = '<i class="fas fa-heart"></i> My Watchlist';
      }
    }

    // 1. Accent color
    if (p.accentColor) {
      applyAccentColor(p.accentColor);
    }

    // 2. Banner
    const bannerEl = document.getElementById('profileBannerImg');
    const defaultBan = BANNER_PRESETS[0];
    const activeBannerUrl = normalizeAssetUrl(p.bannerUrl || defaultBan.url);
    const banMatch = BANNER_PRESETS.find(b => 
      b && (
        b.url === activeBannerUrl || 
        b.fallback === activeBannerUrl || 
        (activeBannerUrl && activeBannerUrl.endsWith(b.url.replace(/^\//, '')))
      )
    );
    bannerEl.src = (banMatch && banMatch.fallback) ? banMatch.fallback : activeBannerUrl;
    bannerEl.onerror = () => {
      if (banMatch && bannerEl.src !== activeBannerUrl) {
        bannerEl.src = activeBannerUrl;
      }
    };
    const bannerLevelTag = document.getElementById('bannerLevelText');
    if (bannerLevelTag && banMatch) {
      bannerLevelTag.innerText = `Lv. ${banMatch.levelReq} • ${banMatch.tier} Poster`;
    }

    // 3. Avatar & Aura
    const avatarImg = document.getElementById('profileAvatarImg');
    const avatarSeed = p.email || p.username || 'AnimeFan';
    const defaultAv = AVATAR_PRESETS[0];
    const activeAvatarUrl = normalizeAssetUrl(p.avatarUrl || defaultAv.url);
    const avMatch = AVATAR_PRESETS.find(a => 
      a && (
        a.url === activeAvatarUrl || 
        a.fallback === activeAvatarUrl || 
        (activeAvatarUrl && activeAvatarUrl.endsWith(a.url.replace(/^\//, '')))
      )
    );
    avatarImg.src = (avMatch && avMatch.fallback) ? avMatch.fallback : activeAvatarUrl;
    avatarImg.onerror = () => {
      if (avMatch && avatarImg.src !== activeAvatarUrl) {
        avatarImg.src = activeAvatarUrl;
      } else {
        avatarImg.onerror = null;
        avatarImg.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`;
      }
    };

    const frameContainer = document.getElementById('avatarFrameContainer');
    frameContainer.className = `avatar-frame-container aura-${p.avatarFrame || 'default'}`;

    // 4. Identity & Rank
    document.getElementById('profileUsername').innerText = p.username || (p.email ? p.email.split('@')[0] : 'Otaku');
    document.getElementById('profileEmailTag').innerText = p.email ? `@${p.username || p.email.split('@')[0]} • ${p.email}` : `@${p.username}`;
    document.getElementById('profileBio').innerText = p.bio || 'Shinobi streaming enthusiast. Exploring infinite anime worlds on Infinx Anime.';

    const badgeConfig = getRankBadgeConfig(p.vipRank);
    const badgeEl = document.getElementById('profileRankBadge');
    badgeEl.className = `rank-badge ${badgeConfig.class}`;
    badgeEl.innerHTML = badgeConfig.label;

    // Admin link if admin (and viewing own profile)
    if (adminLinkBtn && isOwner) {
      adminLinkBtn.style.display = (p.role === 'ADMIN') ? 'inline-flex' : 'none';
    }

    // 5. XP Progression Bar
    document.getElementById('profileLevelBadge').innerText = `LEVEL ${p.level} • ${p.vipRank ? p.vipRank.replace('_', ' ') : 'GENIN'}`;
    document.getElementById('profileXpRatio').innerText = `${p.xp || 0} / ${p.xpNextLevel || (p.level * 200)} XP (${p.xpPercent || 100}%)`;
    document.getElementById('profileXpFill').style.width = `${p.xpPercent || 100}%`;

    // 6. Stats
    const stats = p.stats || {};
    document.getElementById('statWatchTime').innerText = `${stats.totalHoursWatched || 0} hrs`;
    document.getElementById('statEpisodes').innerText = `${stats.totalEpisodesWatched || 0}`;
    document.getElementById('statWatchlist').innerText = `${stats.watchlistCount || 0}`;
    document.getElementById('statStanding').innerText = p.level >= 20 ? 'Top 1% Shinobi' : (p.level >= 10 ? 'Top 5% Otaku' : 'Top 15% Member');

    // 7. Hall of Fame Showcase (Ownership Enforcement: only owner can edit or interact with slots)
    renderHallOfFame(p.topAnime, isOwner, p.username);

    // 8. Recent History
    renderRecentHistory(stats.recentHistory || []);

    // 9. Watchlist (Owner sees personal feed, visitor sees public watchlist items)
    if (isOwner) {
      loadWatchlistFeed();
    } else {
      renderWatchlistItems(p.watchlist || [], p.username);
    }
  }

  const SLOT_CONFIG = [
    { rank: 1, label: 'Champion', icon: 'fa-crown', color: '#ffd700' },
    { rank: 2, label: 'Contender', icon: 'fa-medal', color: '#e2e8f0' },
    { rank: 3, label: 'Favorite', icon: 'fa-award', color: '#f6ad55' }
  ];

  function renderHallOfFame(topAnime, isOwner = true, profileUsername = 'Shinobi') {
    const grid = document.getElementById('hallOfFameGrid');
    if (!grid) return;

    if (typeof topAnime === 'string') {
      try { topAnime = JSON.parse(topAnime); } catch (e) { topAnime = []; }
    }

    const items = Array.isArray(topAnime) ? topAnime : [];

    // Render exactly 3 slots: filled if item exists; interactive empty if owner; read-only if visitor
    grid.innerHTML = [0, 1, 2].map(idx => {
      const item = items[idx];
      const cfg = SLOT_CONFIG[idx] || SLOT_CONFIG[0];

      if (item && item.title) {
        const posterImg = item.poster || item.banner || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400';
        const bannerImg = item.banner || item.poster || posterImg;
        const ratingVal = typeof item.rating === 'number' ? item.rating.toFixed(1) : (parseFloat(item.rating) || 8.0).toFixed(1);
        const epCountText = item.episodesCount ? `${item.episodesCount} Ep` : (item.type === 'movie' ? 'Movie' : '');
        const genreText = item.genres || item.type || 'Anime';
        const watchLink = (typeof item.id === 'string' && item.id.startsWith('lunar-'))
          ? `/watch?id=${item.id.replace('lunar-', '')}&ep=1`
          : (item.lunarId ? `/watch?id=${item.lunarId}&ep=1` : `/watch?id=${item.id || item.showId || 14}&ep=1`);

        const editButtonHtml = isOwner ? `
          <button type="button" class="fame-edit-hover-btn" onclick="event.stopPropagation(); openShowcaseModal(${idx});" title="Change Slot #${idx + 1}">
            <i class="fas fa-pen"></i> Edit
          </button>
        ` : '';

        return `
          <div class="fame-card fame-card-filled" data-slot="${idx}" onclick="window.location.href='${watchLink}'">
            <img class="fame-card-img" src="${bannerImg}" alt="${item.title}" onerror="this.src='${posterImg}'" />
            <div class="fame-card-overlay">
              <div class="fame-rank-num" style="border-color: ${cfg.color}; color: ${cfg.color};">
                <i class="fas ${cfg.icon}"></i> #${idx + 1}
              </div>
              <div class="fame-card-title" title="${item.title}">${item.title}</div>
              <div class="fame-card-meta">
                <span class="fame-rating"><i class="fas fa-star"></i> ${ratingVal}</span>
                <span class="fame-dot">•</span>
                <span class="fame-genre">${genreText}</span>
                ${epCountText ? `<span class="fame-dot">•</span><span class="fame-eps">${epCountText}</span>` : ''}
              </div>
              <div class="fame-completed-tag">
                <i class="fas fa-check-circle"></i> Completed
              </div>
            </div>
            ${editButtonHtml}
          </div>
        `;
      } else {
        if (isOwner) {
          return `
            <div class="fame-card fame-card-empty" data-slot="${idx}" onclick="openShowcaseModal(${idx});">
              <div class="fame-empty-inner">
                <div class="fame-rank-num" style="border-color: ${cfg.color}; color: ${cfg.color};">
                  <i class="fas ${cfg.icon}"></i> #${idx + 1}
                </div>
                <div class="fame-empty-icon"><i class="fas fa-plus"></i></div>
                <div class="fame-empty-title">Slot #${idx + 1} Empty</div>
                <div class="fame-empty-hint">Click to showcase a completed anime</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="fame-card fame-card-empty read-only" data-slot="${idx}" style="cursor: default;">
              <div class="fame-empty-inner">
                <div class="fame-rank-num" style="border-color: ${cfg.color}; color: ${cfg.color};">
                  <i class="fas ${cfg.icon}"></i> #${idx + 1}
                </div>
                <div class="fame-empty-icon" style="opacity: 0.35;"><i class="fas fa-circle-notch"></i></div>
                <div class="fame-empty-title">Slot #${idx + 1} Empty</div>
                <div class="fame-empty-hint" style="color: #64748b;">No anime showcased</div>
              </div>
            </div>
          `;
        }
      }
    }).join('');
  }

  function renderWatchlistItems(items, username = 'Shinobi') {
    const grid = document.getElementById('watchlistGrid');
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">@${username} has no public watchlist items.</div>`;
      return;
    }

    grid.innerHTML = items.slice(0, 12).map(show => {
      const link = `/watch?id=${show.id}&ep=1`;
      const poster = show.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';
      return `
        <div class="profile-media-card" onclick="window.location.href='${link}'">
          <div class="media-poster-box">
            <img class="media-poster-img" src="${poster}" alt="${show.title}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80'" />
            <div class="media-play-overlay">
              <div class="media-play-btn"><i class="fas fa-play"></i></div>
            </div>
          </div>
          <div class="media-card-info">
            <div class="media-card-title" title="${show.title}">${show.title}</div>
            <div class="media-card-sub">${show.year || '2024'} • ${show.badge || 'HD'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // HALL OF FAME SHOWCASE CUSTOMIZER CONTROLLER
  // =========================================================================
  let showcaseWorkingSlots = [null, null, null];
  let currentPickerTargetSlot = 0;
  let cachedCompletedAnime = [];

  function openShowcaseModal(focusSlotIndex = null) {
    if (!isCurrentProfileOwner) {
      showToast('⚠️ Only the account owner can customize their showcase.');
      return;
    }

    const modal = document.getElementById('editShowcaseModal');
    if (!modal) return;

    // Initialize working slots from current user profile
    showcaseWorkingSlots = [null, null, null];
    if (currentUserProfile && Array.isArray(currentUserProfile.topAnime)) {
      currentUserProfile.topAnime.forEach((item, idx) => {
        if (idx < 3) showcaseWorkingSlots[idx] = item;
      });
    }

    renderShowcaseModalSlots();

    // Close picker panel by default
    const pickerPanel = document.getElementById('completedPickerPanel');
    if (pickerPanel) pickerPanel.style.display = 'none';

    modal.classList.add('active');

    // If a specific slot was clicked (e.g. empty slot or edit button), open picker immediately for it
    if (focusSlotIndex !== null && focusSlotIndex >= 0 && focusSlotIndex < 3) {
      openCompletedAnimePicker(focusSlotIndex);
    }
  }

  function closeShowcaseModal() {
    const modal = document.getElementById('editShowcaseModal');
    if (modal) modal.classList.remove('active');
  }

  function renderShowcaseModalSlots() {
    [0, 1, 2].forEach(idx => {
      const item = showcaseWorkingSlots[idx];
      const card = document.getElementById(`showcaseSlotCard-${idx}`);
      const preview = document.getElementById(`slotPreview-${idx}`);
      const actionBtn = document.getElementById(`chooseAnimeBtn-${idx}`);
      const clearBtn = document.getElementById(`clearSlotBtn-${idx}`);

      if (!card || !preview) return;

      if (idx === currentPickerTargetSlot) {
        card.classList.add('active-target');
      } else {
        card.classList.remove('active-target');
      }

      if (item && item.title) {
        const posterImg = item.poster || item.banner || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400';
        const bannerImg = item.banner || item.poster || posterImg;
        const ratingVal = typeof item.rating === 'number' ? item.rating.toFixed(1) : (parseFloat(item.rating) || 8.0).toFixed(1);
        const epText = item.episodesCount ? `${item.episodesCount} Ep` : (item.type === 'movie' ? 'Movie' : 'Completed');

        preview.innerHTML = `
          <div class="slot-filled-preview">
            <img class="slot-filled-img" src="${bannerImg}" alt="${item.title}" onerror="this.src='${posterImg}'" />
            <div class="slot-filled-overlay">
              <div class="slot-filled-title" title="${item.title}">${item.title}</div>
              <div class="slot-filled-meta">
                <span><i class="fas fa-star" style="color: #ffd700;"></i> ${ratingVal}</span>
                <span>•</span>
                <span>${epText}</span>
              </div>
            </div>
          </div>
        `;
        if (clearBtn) clearBtn.style.display = 'flex';
        if (actionBtn) actionBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Change Anime';
      } else {
        preview.innerHTML = `
          <div class="slot-empty-state">
            <i class="fas fa-plus-circle"></i>
            <span>Empty Slot #${idx + 1}</span>
          </div>
        `;
        if (clearBtn) clearBtn.style.display = 'none';
        if (actionBtn) actionBtn.innerHTML = '<i class="fas fa-film"></i> Select Anime';
      }
    });
  }

  async function openCompletedAnimePicker(slotIndex) {
    if (!isCurrentProfileOwner) {
      showToast('⚠️ Only the account owner can pick showcase anime.');
      return;
    }

    currentPickerTargetSlot = slotIndex;
    renderShowcaseModalSlots();

    const pickerPanel = document.getElementById('completedPickerPanel');
    const label = document.getElementById('pickerTargetSlotLabel');
    if (label) label.textContent = `Select Completed Anime for Slot #${slotIndex + 1}`;
    if (pickerPanel) pickerPanel.style.display = 'flex';

    await loadCompletedAnimeList();
  }

  async function loadCompletedAnimeList() {
    const grid = document.getElementById('completedAnimePickerGrid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading completed anime...</div>';

    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/user/completed-anime`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        cachedCompletedAnime = await res.json();
      } else {
        cachedCompletedAnime = [];
      }
    } catch (e) {
      console.warn('Error fetching completed anime:', e);
      cachedCompletedAnime = [];
    }

    renderCompletedPickerGrid(cachedCompletedAnime);
    renderUncompletedHistoryList();
  }

  function renderCompletedPickerGrid(list) {
    const grid = document.getElementById('completedAnimePickerGrid');
    if (!grid) return;

    const searchTerm = (document.getElementById('completedAnimeSearchInput')?.value || '').trim().toLowerCase();
    const filtered = (list || []).filter(item => {
      if (!searchTerm) return true;
      return (item.title && item.title.toLowerCase().includes(searchTerm)) ||
             (item.genres && item.genres.toLowerCase().includes(searchTerm));
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 25px 15px;">
          <div style="font-size: 2.2rem; color: #64748b; margin-bottom: 8px;"><i class="fas fa-tv"></i></div>
          <div style="font-weight: 700; color: #fff; font-size: 1.4rem;">No Completed Anime Found</div>
          <div style="font-size: 1.2rem; margin-top: 4px; color: var(--text-muted);">
            Only anime you have finished watching can be enshrined in your showcase.
          </div>
        </div>
      `;
      return;
    }

    const currentSelectedIds = new Set(
      showcaseWorkingSlots.filter(Boolean).map(item => String(item.id || item.showId || item.lunarId))
    );

    grid.innerHTML = filtered.map(item => {
      const poster = item.poster || item.banner || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200';
      const itemId = String(item.id || item.showId || item.lunarId);
      const isAlreadyChosen = currentSelectedIds.has(itemId);
      const rating = typeof item.rating === 'number' ? item.rating.toFixed(1) : (parseFloat(item.rating) || 8.0).toFixed(1);
      const epCount = item.episodesCount ? `${item.episodesCount} Ep` : (item.type === 'movie' ? 'Movie' : 'Completed');

      return `
        <div class="completed-picker-card ${isAlreadyChosen ? 'already-selected' : ''}" onclick="selectCompletedAnimeForTarget('${encodeURIComponent(JSON.stringify(item))}')">
          <img class="picker-card-poster" src="${poster}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200';" />
          <div class="picker-card-info">
            <div class="picker-card-title" title="${item.title}">${item.title}</div>
            <div class="picker-card-meta">
              <span><i class="fas fa-star" style="color: #ffd700;"></i> ${rating}</span>
              <span>•</span>
              <span>${epCount}</span>
            </div>
            <button type="button" class="picker-card-select-btn">
              ${isAlreadyChosen ? '<i class="fas fa-check"></i> In Showcase' : '<i class="fas fa-plus"></i> Select'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function selectCompletedAnimeForTarget(encodedItem) {
    try {
      const item = JSON.parse(decodeURIComponent(encodedItem));
      showcaseWorkingSlots[currentPickerTargetSlot] = item;
      renderShowcaseModalSlots();

      const pickerPanel = document.getElementById('completedPickerPanel');
      if (pickerPanel) pickerPanel.style.display = 'none';

      showToast(`Added "${item.title}" to Slot #${currentPickerTargetSlot + 1} 👑`);
    } catch (e) {
      console.error('Error selecting anime for slot:', e);
    }
  }

  function clearShowcaseSlot(slotIndex) {
    showcaseWorkingSlots[slotIndex] = null;
    renderShowcaseModalSlots();
    showToast(`Slot #${slotIndex + 1} cleared`);
  }

  function renderUncompletedHistoryList() {
    const listEl = document.getElementById('uncompletedHistoryList');
    if (!listEl) return;

    const history = (currentUserProfile && currentUserProfile.stats && currentUserProfile.stats.recentHistory) || [];
    if (history.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 1.2rem; padding: 10px;">No recent watch history found.</div>`;
      return;
    }

    const completedIds = new Set(cachedCompletedAnime.map(a => String(a.id || a.showId || a.lunarId)));

    const uncompleted = history.filter(h => {
      const id = String(h.showId || h.lunarId || h.id);
      return !completedIds.has(id);
    });

    if (uncompleted.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: #00ff88; font-size: 1.2rem; padding: 10px;"><i class="fas fa-check-circle"></i> All your recent watch history anime are marked completed!</div>`;
      return;
    }

    listEl.innerHTML = uncompleted.slice(0, 6).map(h => {
      const title = h.showTitle || h.title || 'Anime Series';
      const encodedItem = encodeURIComponent(JSON.stringify(h));
      return `
        <div class="history-mark-item">
          <span class="history-mark-title" title="${title}">${title}</span>
          <button type="button" class="history-mark-btn" onclick="markHistoryItemAsCompleted('${encodedItem}')">
            <i class="fas fa-check"></i> Mark Completed
          </button>
        </div>
      `;
    }).join('');
  }

  async function markHistoryItemAsCompleted(encodedItem) {
    try {
      const h = JSON.parse(decodeURIComponent(encodedItem));
      const token = getToken();
      if (!token) return;

      const payload = {
        showId: h.showId || (!isNaN(parseInt(h.id)) ? parseInt(h.id) : null),
        lunarId: h.lunarId || null,
        title: h.showTitle || h.title || 'Anime Series',
        poster: h.poster || '',
        banner: h.banner || h.poster || '',
        rating: 8.5,
        type: 'series',
        genres: 'Anime',
        episodesCount: h.episodeNumber || 1
      };

      const res = await fetch(`${API_BASE}/user/completed-anime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Marked "${payload.title}" as Completed! ✨`);
        await loadCompletedAnimeList();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to mark as completed', true);
      }
    } catch (e) {
      console.error('Error marking history item as completed:', e);
    }
  }

  async function saveShowcaseSlots() {
    if (!isCurrentProfileOwner) {
      showToast('⚠️ Access Denied: Only the account owner can modify their showcase.');
      return;
    }

    const token = getToken();
    if (!token) return;

    const saveBtn = document.getElementById('saveShowcaseBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    // Filter out nulls but preserve authentic slot order
    const cleanedShowcase = showcaseWorkingSlots.filter(Boolean);

    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topAnime: cleanedShowcase })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update Hall of Fame showcase.');
      }

      const result = await res.json();
      if (currentUserProfile) {
        currentUserProfile.topAnime = (result.user && result.user.topAnime) || cleanedShowcase;
      }

      renderHallOfFame(currentUserProfile.topAnime);
      closeShowcaseModal();
      showToast('🎉 Hall of Fame Showcase updated successfully!');
    } catch (err) {
      alert(`Error saving showcase: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Save Showcase</span>';
      }
    }
  }

  function initShowcaseModal() {
    const openBtn = document.getElementById('openShowcaseModalBtn');
    const closeBtn = document.getElementById('closeEditShowcaseModal');
    const cancelBtn = document.getElementById('cancelShowcaseBtn');
    const saveBtn = document.getElementById('saveShowcaseBtn');
    const closePickerBtn = document.getElementById('closePickerPanelBtn');
    const searchInput = document.getElementById('completedAnimeSearchInput');
    const toggleAccordion = document.getElementById('toggleMarkCompletedSection');

    if (openBtn) openBtn.addEventListener('click', () => openShowcaseModal(0));
    if (closeBtn) closeBtn.addEventListener('click', closeShowcaseModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeShowcaseModal);
    if (saveBtn) saveBtn.addEventListener('click', saveShowcaseSlots);

    if (closePickerBtn) {
      closePickerBtn.addEventListener('click', () => {
        const panel = document.getElementById('completedPickerPanel');
        if (panel) panel.style.display = 'none';
      });
    }

    [0, 1, 2].forEach(idx => {
      const chooseBtn = document.getElementById(`chooseAnimeBtn-${idx}`);
      const clearBtn = document.getElementById(`clearSlotBtn-${idx}`);
      if (chooseBtn) chooseBtn.addEventListener('click', () => openCompletedAnimePicker(idx));
      if (clearBtn) clearBtn.addEventListener('click', () => clearShowcaseSlot(idx));
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderCompletedPickerGrid(cachedCompletedAnime);
      });
    }

    if (toggleAccordion) {
      toggleAccordion.addEventListener('click', () => {
        const body = document.getElementById('markCompletedBody');
        const chevron = document.getElementById('accordionChevron');
        if (body) {
          const isHidden = body.style.display === 'none';
          body.style.display = isHidden ? 'block' : 'none';
          if (chevron) {
            chevron.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
          }
        }
      });
    }
  }

  window.openShowcaseModal = openShowcaseModal;
  window.selectCompletedAnimeForTarget = selectCompletedAnimeForTarget;
  window.markHistoryItemAsCompleted = markHistoryItemAsCompleted;

  function renderRecentHistory(history) {
    const grid = document.getElementById('recentHistoryGrid');
    if (!grid) return;

    if (!history || history.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">No watch history yet. Start watching an episode!</div>`;
      return;
    }

    grid.innerHTML = history.slice(0, 8).map(item => {
      const pct = (item.progress && item.duration) ? Math.min(100, Math.round((item.progress / item.duration) * 100)) : 0;
      const showTitle = item.showTitle || item.title || 'Anime Series';
      const epTitle = item.episodeTitle || `Episode ${item.episodeNumber || 1}`;
      const poster = item.poster || item.banner || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';
      const link = `/watch?id=${item.lunarId || 1735}&ep=${item.episodeNumber || 1}`;

      return `
        <div class="profile-media-card" onclick="window.location.href='${link}'">
          <div class="media-poster-box">
            <img class="media-poster-img" src="${poster}" alt="${showTitle}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80'" />
            <div class="media-play-overlay">
              <div class="media-play-btn"><i class="fas fa-play"></i></div>
            </div>
            ${pct > 0 ? `
              <div class="media-progress-bar">
                <div class="media-progress-fill" style="width: ${pct}%"></div>
              </div>
            ` : ''}
          </div>
          <div class="media-card-info">
            <div class="media-card-title" title="${showTitle}">${showTitle}</div>
            <div class="media-card-sub" title="${epTitle}">${epTitle} • ${pct}% watched</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadWatchlistFeed() {
    const token = getToken();
    const grid = document.getElementById('watchlistGrid');
    if (!grid || !token) return;

    try {
      const res = await fetch(`${API_BASE}/user/watchlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;

      const items = await res.json();
      if (!items || items.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Your watchlist is currently empty. Click the heart on any anime to save it here!</div>`;
        return;
      }

      grid.innerHTML = items.slice(0, 8).map(show => {
        const link = `/watch?id=${show.id}&ep=1`;
        const poster = show.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';
        return `
          <div class="profile-media-card" onclick="window.location.href='${link}'">
            <div class="media-poster-box">
              <img class="media-poster-img" src="${poster}" alt="${show.title}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80'" />
              <div class="media-play-overlay">
                <div class="media-play-btn"><i class="fas fa-play"></i></div>
              </div>
            </div>
            <div class="media-card-info">
              <div class="media-card-title" title="${show.title}">${show.title}</div>
              <div class="media-card-sub">${show.year || '2024'} • ${show.badge || 'HD'}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // =========================================================================
  // EDIT PROFILE MODAL LOGIC
  // =========================================================================
  let selectedAvatarUrl = null;
  let selectedAuraFrame = 'default';
  let selectedBannerUrl = null;
  let selectedAccentColor = '#ff0055';

  function initEditModal() {
    const modal = document.getElementById('editProfileModal');
    const openBtn = document.getElementById('openEditProfileBtn');
    const openBannerBtn = document.getElementById('openBannerEditBtn');
    const closeBtn = document.getElementById('closeEditProfileModal');
    const cancelBtn = document.getElementById('cancelEditProfileBtn');

    function openModal() {
      if (!isCurrentProfileOwner || !currentUserProfile) {
        showToast('⚠️ Access Denied: Only the account owner can edit this profile.');
        return;
      }
      document.getElementById('editUsernameInput').value = currentUserProfile.username || '';
      document.getElementById('editBioInput').value = currentUserProfile.bio || '';
      document.getElementById('editPrivateToggle').checked = Boolean(currentUserProfile.isPrivate);

      selectedAvatarUrl = currentUserProfile.avatarUrl;
      selectedAuraFrame = currentUserProfile.avatarFrame || 'default';
      selectedBannerUrl = currentUserProfile.bannerUrl;
      selectedAccentColor = currentUserProfile.accentColor || '#ff0055';

      renderModalPresets();
      modal.classList.add('active');
    }

    function closeModal() {
      modal.classList.remove('active');
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (openBannerBtn) openBannerBtn.addEventListener('click', () => {
      openModal();
      switchModalTab('banner');
    });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Modal Tabs
    document.querySelectorAll('.modal-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const target = tabBtn.getAttribute('data-tab');
        switchModalTab(target);
      });
    });

    // Save Profile Form
    document.getElementById('saveProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isCurrentProfileOwner) {
        showToast('⚠️ Access Denied: Only the account owner has ownership of this account.');
        return;
      }
      const token = getToken();
      if (!token) return;

      const username = document.getElementById('editUsernameInput').value.trim();
      const bio = document.getElementById('editBioInput').value.trim();
      const isPrivate = document.getElementById('editPrivateToggle').checked;
      // Validation: verify level requirements before saving
      const userLvl = currentUserProfile?.level || 1;
      const avMatch = AVATAR_PRESETS.find(a => a.url === selectedAvatarUrl || a.fallback === selectedAvatarUrl || (selectedAvatarUrl && selectedAvatarUrl.endsWith(a.url.replace(/^\//, ''))));
        if (avMatch && avMatch.levelReq > userLvl) {
          showToast(`🔒 Cannot equip ${avMatch.name}: requires Level ${avMatch.levelReq}!`);
          return;
        }
        const banMatch = BANNER_PRESETS.find(b => b.url === selectedBannerUrl || b.fallback === selectedBannerUrl || (selectedBannerUrl && selectedBannerUrl.endsWith(b.url.replace(/^\//, ''))));
        if (banMatch && banMatch.levelReq > userLvl) {
          showToast(`🔒 Cannot equip "${banMatch.name}": requires Level ${banMatch.levelReq}!`);
          return;
        }
        const auraMatch = AURA_PRESETS.find(a => a.id === selectedAuraFrame);
        if (auraMatch && auraMatch.levelReq > userLvl) {
          showToast(`🔒 Cannot equip ${auraMatch.name}: requires Level ${auraMatch.levelReq}!`);
          return;
        }

      const payload = {
        username,
        bio,
        avatarUrl: normalizeAssetUrl(selectedAvatarUrl),
        avatarFrame: selectedAuraFrame,
        bannerUrl: normalizeAssetUrl(selectedBannerUrl),
        accentColor: selectedAccentColor,
        isPrivate
      };

      try {
        const res = await fetch(`${API_BASE}/user/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          currentUserProfile = { ...currentUserProfile, ...data.user };
          persistUserProfileToStorage(currentUserProfile);
          renderProfileUI(currentUserProfile);
          closeModal();
          showToast('Profile & Shinobi Passport saved successfully! ✨');
        } else {
          alert('Failed to save profile. Please check connection.');
        }
      } catch (err) {
        console.error(err);
        alert('Error connecting to server.');
      }
    });
  }

  function switchModalTab(target) {
    document.querySelectorAll('.modal-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === target);
    });
    document.querySelectorAll('.modal-tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `tabPane-${target}`);
    });
  }

  async function simulateOrSetLevel(targetLevel) {
    const userRole = currentUserProfile?.role || 'USER';
    if (userRole !== 'ADMIN') {
      showToast('🛡️ Access Denied: Only administrators have privileges to manually adjust levels. Level up naturally by watching anime & gaining XP!');
      return;
    }

    targetLevel = Math.max(1, Math.min(100, parseInt(targetLevel) || 1));
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ level: targetLevel })
      });
      if (res.ok) {
        const data = await res.json();
        currentUserProfile = { ...currentUserProfile, ...data.user };
        persistUserProfileToStorage(currentUserProfile);
        renderProfileUI(currentUserProfile);
        renderModalPresets();
        showToast(`⚡ Admin Override: Level set to Level ${targetLevel} (${(currentUserProfile.vipRank || 'GENIN').replace('_', ' ')})! Unlock states updated.`);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`❌ ${errData.error || 'Failed to update level.'}`);
      }
    } catch (e) {
      console.warn('Level update failed:', e);
      showToast('❌ Level update failed.');
    }
  }

  function renderModalPresets() {
    const userLevel = currentUserProfile?.level || 1;
    const userRole = currentUserProfile?.role || 'USER';
    const isAdmin = userRole === 'ADMIN';

    // 0. Update Modal Level Status Bar
    const statusText = document.getElementById('modalLevelText');
    if (statusText) {
      const rank = currentUserProfile?.vipRank ? currentUserProfile.vipRank.replace('_', ' ') : 'GENIN';
      statusText.innerText = `LEVEL ${userLevel} • ${rank}`;
    }

    // Level simulator chips: Strictly accessible ONLY by administrators
    const chipsContainer = document.getElementById('levelSimulatorChips');
    if (chipsContainer) {
      if (isAdmin) {
        chipsContainer.style.display = 'flex';
        const chips = chipsContainer.querySelectorAll('.sim-chip');
        chips.forEach(chip => {
          const chipLvl = parseInt(chip.getAttribute('data-sim-lvl'));
          chip.classList.toggle('active', chipLvl === userLevel);
          chip.onclick = (e) => {
            e.preventDefault();
            simulateOrSetLevel(chipLvl);
          };
        });
      } else {
        chipsContainer.style.display = 'none';
        chipsContainer.remove(); // Safely strip from DOM so regular users cannot inspect and unhide
      }
    }

    // 1. Avatar Presets
    const avatarGrid = document.getElementById('modalAvatarPresetsGrid');
    if (avatarGrid) {
      avatarGrid.innerHTML = AVATAR_PRESETS.map(av => {
        const req = av.levelReq || 1;
        const isLocked = userLevel < req;
        const isSel = selectedAvatarUrl === av.url || selectedAvatarUrl === av.fallback || (selectedAvatarUrl && selectedAvatarUrl.endsWith(av.url.replace(/^\//, '')));
        const lvlTag = isLocked
          ? `<span class="preset-lvl-tag locked"><i class="fas fa-lock"></i> Lv.${req}</span>`
          : `<span class="preset-lvl-tag unlocked"><i class="fas fa-check"></i> Lv.${req}</span>`;
        const lockIcon = isLocked ? `<div class="preset-lock-overlay"><i class="fas fa-lock"></i></div>` : '';

        return `
          <div class="preset-avatar-item ${isSel ? 'selected' : ''} ${isLocked ? 'locked' : ''}" 
               data-url="${av.url}" 
               data-fallback="${av.fallback}" 
               data-level="${req}" 
               data-name="${av.name}" 
               data-locked="${isLocked}" 
               title="${av.name} (${av.anime}) - ${isLocked ? `🔒 Locked (Requires Level ${req})` : `✓ Unlocked (Level ${req})`}">
            ${lvlTag}
            <img src="${av.fallback || normalizeAssetUrl(av.url)}" data-local="${normalizeAssetUrl(av.url)}" class="preset-avatar-option" alt="${av.name}" loading="lazy" onerror="if(this.dataset.local && this.src!==this.dataset.local){this.onerror=null; this.src=this.dataset.local;}" />
            ${lockIcon}
            <span class="preset-avatar-name">${av.name}</span>
          </div>
        `;
      }).join('');

      avatarGrid.querySelectorAll('.preset-avatar-item').forEach(item => {
        item.addEventListener('click', () => {
          const isLocked = item.getAttribute('data-locked') === 'true';
          const req = item.getAttribute('data-level');
          const name = item.getAttribute('data-name');
          if (isLocked) {
            item.classList.remove('shake-locked');
            void item.offsetWidth;
            item.classList.add('shake-locked');
            showToast(`🔒 Level ${req} Required! Reach Level ${req} to unlock ${name}. (Current Level: ${userLevel})`);
            return;
          }
          avatarGrid.querySelectorAll('.preset-avatar-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          selectedAvatarUrl = item.getAttribute('data-url');
        });
      });
    }

    // 2. Aura Selector Cards
    document.querySelectorAll('.aura-option-card').forEach(card => {
      const aura = card.getAttribute('data-aura');
      const auraConfig = AURA_PRESETS.find(a => a.id === aura) || { levelReq: 1, name: 'Aura' };
      const isLocked = userLevel < auraConfig.levelReq;
      card.classList.toggle('locked', isLocked);
      card.classList.toggle('selected', aura === selectedAuraFrame && !isLocked);

      let badge = card.querySelector('.aura-lvl-tag');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'aura-lvl-tag';
        card.appendChild(badge);
      }
      badge.className = `aura-lvl-tag ${isLocked ? 'locked' : 'unlocked'}`;
      badge.innerHTML = isLocked ? `<i class="fas fa-lock"></i> Lv.${auraConfig.levelReq}` : `<i class="fas fa-check"></i> Lv.${auraConfig.levelReq}`;

      card.onclick = () => {
        if (isLocked) {
          card.classList.remove('shake-locked');
          void card.offsetWidth;
          card.classList.add('shake-locked');
          showToast(`🔒 Level ${auraConfig.levelReq} Required! Reach Level ${auraConfig.levelReq} to unlock ${auraConfig.name}.`);
          return;
        }
        document.querySelectorAll('.aura-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedAuraFrame = aura;
      };
    });

    // 3. Banner / Poster Presets
    const bannerGrid = document.getElementById('modalBannerPresetsGrid');
    if (bannerGrid) {
      bannerGrid.innerHTML = BANNER_PRESETS.map(ban => {
        const req = ban.levelReq || 1;
        const isLocked = userLevel < req;
        const isSel = selectedBannerUrl === ban.url || selectedBannerUrl === ban.fallback || (selectedBannerUrl && selectedBannerUrl.endsWith(ban.url.replace(/^\//, '')));
        const lvlTag = isLocked
          ? `<span class="banner-lvl-tag locked"><i class="fas fa-lock"></i> Unlocks at Lv. ${req}</span>`
          : `<span class="banner-lvl-tag unlocked"><i class="fas fa-check"></i> Unlocked (Lv. ${req})</span>`;
        const lockCenter = isLocked
          ? `<div class="banner-lock-center"><i class="fas fa-lock"></i><span>Level ${req} Required</span></div>`
          : '';

        return `
          <div class="fame-card ${isSel ? 'selected' : ''} ${isLocked ? 'locked' : ''}" 
               style="height: 120px; cursor: ${isLocked ? 'not-allowed' : 'pointer'};" 
               data-url="${ban.url}" 
               data-fallback="${ban.fallback}" 
               data-level="${req}" 
               data-name="${ban.name}" 
               data-locked="${isLocked}"
               title="${ban.name} - ${isLocked ? `🔒 Locked (Level ${req} Required)` : `✓ Unlocked (Level ${req})`}">
            ${lvlTag}
            <img class="fame-card-img" src="${ban.fallback || normalizeAssetUrl(ban.url)}" data-local="${normalizeAssetUrl(ban.url)}" alt="${ban.name}" loading="lazy" onerror="if(this.dataset.local && this.src!==this.dataset.local){this.onerror=null; this.src=this.dataset.local;}" />
            ${lockCenter}
            <div class="fame-card-overlay" style="padding: 10px; background: linear-gradient(180deg, transparent 0%, rgba(6,7,13,0.92) 100%);">
              <div style="font-size: 1.25rem; font-weight: 700; color: #fff;">${ban.name}</div>
            </div>
          </div>
        `;
      }).join('');

      bannerGrid.querySelectorAll('.fame-card').forEach(card => {
        card.addEventListener('click', () => {
          const isLocked = card.getAttribute('data-locked') === 'true';
          const req = card.getAttribute('data-level');
          const name = card.getAttribute('data-name');
          if (isLocked) {
            card.classList.remove('shake-locked');
            void card.offsetWidth;
            card.classList.add('shake-locked');
            showToast(`🔒 Level ${req} Required! Reach Level ${req} to unlock "${name}". (Current Level: ${userLevel})`);
            return;
          }
          bannerGrid.querySelectorAll('.fame-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedBannerUrl = card.getAttribute('data-url');
        });
      });
    }

    // 4. Accent Palette
    const accentRow = document.getElementById('modalAccentRow');
    if (accentRow) {
      accentRow.innerHTML = ACCENT_COLORS.map(col => {
        const isSel = selectedAccentColor.toLowerCase() === col.hex.toLowerCase();
        return `<div class="accent-color-circle ${isSel ? 'selected' : ''}" style="background: ${col.hex}; color: ${col.hex};" data-hex="${col.hex}" title="${col.name}"></div>`;
      }).join('');

      accentRow.querySelectorAll('.accent-color-circle').forEach(circle => {
        circle.addEventListener('click', () => {
          accentRow.querySelectorAll('.accent-color-circle').forEach(c => c.classList.remove('selected'));
          circle.classList.add('selected');
          selectedAccentColor = circle.getAttribute('data-hex');
          applyAccentColor(selectedAccentColor);
        });
      });
    }
  }

  // Tab switching in Main Profile
  function initProfileTabs() {
    document.querySelectorAll('.profile-tabs-nav .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.profile-tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content-panel').forEach(panel => panel.classList.remove('active'));
        const activePanel = document.getElementById(`panel-${target}`);
        if (activePanel) activePanel.classList.add('active');
      });
    });

    // Share Profile Link
    const shareBtn = document.getElementById('shareProfileBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          showToast('Otaku Profile link copied to clipboard! 📋');
        }).catch(() => {
          prompt('Copy your profile link:', url);
        });
      });
    }
  }

  // =========================================================================
  // UNIFIED HEADER CONTROLLER (Identical to Home Page)
  // =========================================================================
  function updateHeaderAuth(profile) {
    const authHeader = document.getElementById('authHeader');
    const drawerAuthHeader = document.getElementById('drawerAuthHeader');
    const token = getToken();

    // STRICT OWNER PRINCIPLE: Header ALWAYS reflects the logged-in session user
    const safeProfile = isCurrentProfileOwner ? profile : null;

    const email = (safeProfile && safeProfile.email) || localStorage.getItem('infinx_user_email') || 'User';
    const role = (safeProfile && safeProfile.role) || localStorage.getItem('infinx_user_role');
    const rawUser = localStorage.getItem('infinx_user');
    let parsedUser = null;
    try { if (rawUser) parsedUser = JSON.parse(rawUser); } catch(e) {}

    const username = (safeProfile && safeProfile.username) || localStorage.getItem('infinx_username') || (parsedUser && parsedUser.username) || email.split('@')[0];
    const displayName = username.charAt(0).toUpperCase() + username.slice(1);
    const rawAvatar = (safeProfile && safeProfile.avatarUrl) || localStorage.getItem('infinx_avatar') || (parsedUser && parsedUser.avatarUrl);
    const avatarUrl = normalizeAssetUrl(rawAvatar);
    const avatarFrame = (safeProfile && safeProfile.avatarFrame) || localStorage.getItem('infinx_avatar_frame') || (parsedUser && parsedUser.avatarFrame) || 'default';
    const initial = (displayName || email || 'U')[0].toUpperCase();

    const avatarHtml = avatarUrl
      ? `<div class="user-avatar aura-${avatarFrame}" title="${displayName} (${email})"><img src="${avatarUrl}" alt="${displayName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span style="display:none;">${initial}</span></div>`
      : `<div class="user-avatar aura-${avatarFrame}" title="${displayName} (${email})">${initial}</div>`;

    if (token) {
      const adminLink = role === 'ADMIN' ? `<a href="/admin.html" class="nav-link" style="color: var(--secondary);"><i class="fas fa-lock"></i> Admin</a>` : '';

      if (authHeader) {
        authHeader.innerHTML = `
          <div class="user-profile-menu">
            ${adminLink}
            <a href="/profile.html" class="nav-link profile-name-text"><i class="fas fa-user-ninja" style="color: var(--primary);"></i> <span>${displayName}</span></a>
            <a href="/profile.html" class="user-avatar-link" title="View Profile (${displayName})">
              ${avatarHtml}
            </a>
            <button class="btn btn-secondary btn-small" id="headerLogoutBtn">Logout</button>
          </div>
        `;
        const logoutBtn = document.getElementById('headerLogoutBtn');
        if (logoutBtn) logoutBtn.onclick = handleLogout;
      }

      if (drawerAuthHeader) {
        const drawerAvatarHtml = avatarUrl
          ? `<div class="user-avatar aura-${avatarFrame}" style="width: 44px; height: 44px; flex-shrink: 0;"><img src="${avatarUrl}" alt="${displayName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span style="display:none;">${initial}</span></div>`
          : `<div class="user-avatar aura-${avatarFrame}" style="width: 44px; height: 44px; flex-shrink: 0;">${initial}</div>`;

        drawerAuthHeader.innerHTML = `
          <a href="/profile.html" style="text-decoration: none; display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            ${drawerAvatarHtml}
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <div style="font-size: 1.45rem; font-weight: 700; color: white;">${displayName}</div>
              <div style="font-size: 1.15rem; color: var(--gray-text);">${email}</div>
            </div>
          </a>
          <a href="/profile.html" class="nav-link active" style="color: white; margin-bottom: 6px;"><i class="fas fa-user-ninja" style="color: var(--primary);"></i> My Otaku Profile & Passport</a>
          ${role === 'ADMIN' ? `<a href="/admin.html" class="nav-link" style="color: var(--secondary);"><i class="fas fa-lock"></i> Admin Panel</a>` : ''}
          <button class="btn btn-secondary" id="drawerLogoutBtn" style="width: 100%; justify-content: center; text-transform: uppercase; margin-top: 6px;"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
        const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');
        if (drawerLogoutBtn) drawerLogoutBtn.onclick = handleLogout;
      }
    } else {
      if (authHeader) {
        authHeader.innerHTML = `<a href="index.html#login" class="btn btn-secondary btn-small">Sign In</a>`;
      }
      if (drawerAuthHeader) {
        drawerAuthHeader.innerHTML = `
          <a href="index.html#login" class="btn btn-primary" style="width: 100%; justify-content: center; text-transform: uppercase; margin-bottom: 8px;"><i class="fas fa-sign-in-alt"></i> Sign In</a>
          <a href="index.html#register" class="btn btn-secondary" style="width: 100%; justify-content: center; text-transform: uppercase;"><i class="fas fa-user-plus"></i> Register</a>
        `;
      }
    }
  }

  function handleLogout(e) {
    if (e) e.stopPropagation();
    localStorage.clear();
    window.location.href = 'index.html';
  }

  function setupMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const navbar = document.getElementById('mainNavbar');
    const closeBtn = document.getElementById('closeDrawer');
    const navOverlay = document.getElementById('navOverlay');

    const openDrawer = () => {
      navbar?.classList.add('active');
      navOverlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      navbar?.classList.remove('active');
      navOverlay?.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (toggle) toggle.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (navOverlay) navOverlay.addEventListener('click', closeDrawer);

    // Dropdown toggle click handlers (Genres & Categories)
    document.querySelectorAll('#mainNavbar .dropdown-toggle').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const parent = this.closest('.nav-item-dropdown');
        if (parent) {
          const wasActive = parent.classList.contains('active');
          document.querySelectorAll('.nav-item-dropdown').forEach(d => d.classList.remove('active'));
          if (!wasActive) parent.classList.add('active');
        }
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-item-dropdown')) {
        document.querySelectorAll('.nav-item-dropdown').forEach(d => d.classList.remove('active'));
      }
    });

    // Close drawer when clicking nav links on mobile
    document.querySelectorAll('#mainNavbar .nav-link:not(.dropdown-toggle), #mainNavbar .dropdown-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1080) closeDrawer();
      });
    });
  }

  function setupSearchListeners() {
    const searchInput = document.getElementById('searchInput');
    const liveDropdown = document.getElementById('liveSearchDropdown');
    let searchDebounceTimeout = null;

    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          if (liveDropdown) liveDropdown.style.display = 'none';
          window.location.href = `view.html#search?q=${encodeURIComponent(q)}`;
        }
      }
    });

    if (liveDropdown) {
      searchInput.addEventListener('input', function () {
        clearTimeout(searchDebounceTimeout);
        const term = this.value.trim();
        searchDebounceTimeout = setTimeout(async () => {
          if (!term || term.length < 2) {
            liveDropdown.innerHTML = '';
            liveDropdown.style.display = 'none';
            return;
          }
          try {
            const res = await fetch(`${API_BASE}/shows/search?q=${encodeURIComponent(term)}`);
            if (!res.ok) return;
            const results = await res.json();
            if (!results || results.length === 0) {
              liveDropdown.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--gray-text); font-size: 1.3rem;">No matching anime or shows found for "${term}"</div>`;
              liveDropdown.style.display = 'block';
              return;
            }
            const itemsHtml = results.slice(0, 7).map(item => {
              const posterUrl = item.poster || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100';
              const isAnime = item.isLunar || (typeof item.id === 'string' && item.id.startsWith('lunar-')) || item.anilistId;
              const badge = isAnime ? 'Anime' : (item.badge || 'HD');
              const linkUrl = isAnime && item.anilistId ? `/watch?id=${item.anilistId}&ep=1` : `view.html#search?q=${encodeURIComponent(item.title || term)}`;
              return `
                <a href="${linkUrl}" class="live-search-item">
                  <img src="${posterUrl}" alt="${item.title || ''}" class="live-search-thumb" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100';">
                  <div class="live-search-info">
                    <div class="live-search-title">${item.title}</div>
                    <div class="live-search-meta">
                      <span class="live-search-rating"><i class="fas fa-star"></i> ${item.rating || '4.9'}</span>
                      <span>•</span>
                      <span>${item.year || '2024'}</span>
                      <span class="live-search-badge">${badge}</span>
                    </div>
                  </div>
                </a>
              `;
            }).join('');
            liveDropdown.innerHTML = `
              ${itemsHtml}
              <div class="live-search-footer" onclick="window.location.href='view.html#search?q=${encodeURIComponent(term)}'">
                View all results for "${term}" <i class="fas fa-arrow-right"></i>
              </div>
            `;
            liveDropdown.style.display = 'block';
          } catch (err) {
            console.warn('Live search error:', err);
          }
        }, 220);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
          liveDropdown.style.display = 'none';
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuth(null);
    setupMobileMenu();
    setupSearchListeners();
    loadProfile();
    initProfileTabs();
    initEditModal();
    initShowcaseModal();
  });
})();
