/*************************
 * PROMPTS DATASET
 * You can add up to 30 entries.
 *************************/

const prompts = [
  {
    name: "MyAnimeList",    src: "./logos/MAL.svg",    bg: "#ffffff",    prompt: "Draw the MyAnimeList logo."
  },
  {
    name: "Kineta",    src: "./logos/kineta.webp",    bg: "#ffffff",    prompt: "Draw Kineta's profile picture",
    palette:['#fdfcfc', '#fdc028', '#f30a8c', '#f77a2b', '#171514', '#cda8a3']
  },
  {
    name: "FMAB",    src: "./logos/FMAB.jpg",    bg: "#ffffff",    prompt: "Draw the FMAB poster",
    palette:['#19161c', '#f8f4e1', '#dcc8a2', '#423c41', '#bc8e6d', '#7d635e']  },
  {
    name: "CR",    src: "./logos/CR.png",    bg: "#ffffff",    prompt: "Draw the Crunchyroll logo",
    palette:['#ff5d00', '#fffefe', '#ff7428', '#ffd9c9', '#ffb591', '#ff935b']
  },
  {
    name: "Akira",    src: "./logos/Akira.jpg",    bg: "#ffffff",    prompt: "Draw the Akira poster",
    palette:['#f5f9f3', '#e53630', '#b17b71', '#bfbab5', '#72403c', '#1d0f0d']
  },
  {
    name: "A1",    src: "./logos/A1.jpg",    bg: "#ffffff",    prompt: "Draw the A-1 logo",
    palette:['#fefefe', '#5884cd', '#d5deea', '#9fb3d4', '#1f1f20', '#7b7b7c']
  },
  {
    name: "Pochita",    src: "./logos/Pochita.jpg",    bg: "#ffffff",    prompt: "Draw Pochita from CSM",
    palette:['#d26853', '#d1a17d', '#fefbf9', '#d8c6b3', '#6b463d', '#3d221c']
  },
  {
    name: "Totoro",    src: "./logos/Totoro.jpg",    bg: "#ffffff",    prompt: "Draw Totoro",
    palette:['#fdfdee', '#554d43', '#222121', '#3c80ef', '#d8a375', '#806b57']
  },
  {
    name: "YourName",    src: "./logos/YourName.jpg",    bg: "#ffffff",    prompt: "Draw the Your Name poster",
    palette:['#4fa3da', '#0e64ae', '#d8dbdf', '#8ebddf', '#3c494b', '#8d8777']
  },
  {
    name: "Yugioh",    src: "./logos/Yugi.jpg",    bg: "#ffffff",    prompt: "Draw Yuugi Mutou from Yu☆Gi☆Oh!",
    palette:['#282535', '#f9f9f9', '#785648', '#4c527d', '#a57c81', '#d6c0a1']
  },
  {
    name: "Doraemon",    src: "./logos/Doraemon.png",    bg: "#ffffff",    prompt: "Draw Doraemon",
    palette:['#fefefd', '#0093de', '#20252b', '#c6c3ad', '#7b7665', '#cd011b']
  },
  {
    name: "Pikachu",    src: "./logos/Pikachu.jpg",    bg: "#ffffff",    prompt: "Draw Pikachu",
    palette:['#fad61f', '#fcfcfc', '#3a1e0e', '#d89c25', '#857956', '#e43b36']
  },
  {
    name: "02",    src: "./logos/02.jpg",    bg: "#ffffff",    prompt: "Draw Zero Two from Darling in the FranXX",
    palette:['#ec574b', '#f3d2cc', '#c88989', '#f6ede3', '#73534a', '#a2b6b2']
  },
  {
    name: "Koro",    src: "./logos/Koro.jpg",    bg: "#ffffff",    prompt: "Draw Koro Sensei from Assassination Classroom",
    palette:['#292726', '#fbee64', '#dca637', '#f3f0d4', '#70493a', '#bc9e8e']
  },
  {
    name: "Scissor",    src: "./logos/Scissor.webp",    bg: "#ffffff",    prompt: "Draw the Scissor Sword from Kill La Kill",
    palette:['#000000', '#7c3137', '#3d223b', '#5e2429', '#2b0f13', '#db717f']
  },
  {
    name: "VizMedia",    src: "./logos/VizMedia.jpg",    bg: "#ffffff",    prompt: "Draw Viz Media logo",
    palette:['#ed1a23', '#fdfefe', '#e65d63', '#ea8586', '#eeb1b3', '#f8e2e0']
  },
  {
    name: "Sharingan",    src: "./logos/Sharingan.jpg",    bg: "#ffffff",    prompt: "Draw the Sharingan from Naruto",
    palette:['#aa0000', '#fefefe', '#020000', '#500000', '#a4a4a4', '#4c4c4c']
  },
  {
    name: "Tim",    src: "./logos/tim.webp",    bg: "#ffffff",    prompt: "Draw the Chainsaw Man Movie: Reze-hen poster",
    palette:['#0b1825', '#f23b48', '#64131d', '#c4151e', '#75797b', '#e9ddde']
  },
  {
    name: "Anya",    src: "./logos/Anya.jpg",    bg: "#ffffff",    prompt: "Draw Anya from Spy x Family",
    palette:['#efb3a4', '#443a35', '#97b4ad', '#f8ece1', '#97665a', '#c48e77']
  },
  {
    name: "DeathNote",    src: "./logos/DeathNote.jpg",    bg: "#ffffff",    prompt: "Draw the Death Note poster",
    palette:['#05070a', '#19232a', '#3d494f', '#667577', '#9aa39c', '#d9d9ce']
  },
  {
    name: "Geass",    src: "./logos/Geass.jpg",    bg: "#ffffff",    prompt: "Draw the Geass eye from Code Geass",
    palette:['#868824', '#c28584', '#2c1e13', '#5a491e', '#e7974c', '#8c4543']
  },
  {
    name: "Eva",    src: "./logos/Eva.jpg",    bg: "#ffffff",    prompt: "Draw the End of Evangelion poster",
    palette:['#f8f5f9', '#030208', '#38458f', '#b194c1', '#1d1849', '#ef675f']
  },
  {
    name: "Gojou",    src: "./logos/Gojou.jpg",    bg: "#ffffff",    prompt: "Draw Gojou from Jujutsu Kaisen",
    palette:['#171722', '#f0ebf2', '#d5c0c0', '#103141', '#6e6077', '#0a6d82']
  },
  {
    name: "Happy",    src: "./logos/Happy.jpg",    bg: "#ffffff",    prompt: "Draw Happy from Fairy Tail",
    palette:['#fefefe', '#70a4c5', '#ebeef0', '#566d7c', '#ada5a4', '#35393c']
  },
  {
    name: "Kyuubey",    src: "./logos/Kyuubey.jpg",    bg: "#ffffff",    prompt: "Draw Kyuubey from Madoka Magica",
    palette:['#fcfcfb', '#a0d6ea', '#d8e9ec', '#c7cbab', '#819a7e', '#c96551']
  },
  {
    name: "Moon",    src: "./logos/Moon.webp",    bg: "#ffffff",    prompt: "Draw the Moon from Soul Eater",
    palette:['#4e2f70', '#c7abf3', '#f1e14d', '#ab9243', '#423049', '#f1f1d6']
  },
  {
    name: "Saitama",    src: "./logos/Saitama.jpg",    bg: "#ffffff",    prompt: "Draw Saitama from One Punch Man",
    palette:['#796255', '#4f351f', '#f9d3a7', '#1d150e', '#ad9783', '#fbf7e7']
  },
  {
    name: "StrawHat",    src: "./logos/StrawHat.png",    bg: "#ffffff",    prompt: "Draw the Straw Hat flag from One Piece",
    palette:['#000000', '#fcfcfc', '#e4a63b', '#784a3d', '#9f9f9f', '#362922']
  },
  {
    name: "Survey",    src: "./logos/Survey.webp",    bg: "#ffffff",    prompt: "Draw the Survey Corp logo from Attack on Titan",
    palette:['#9b9a9e', '#eeeef0', '#c8c7c9', '#131f51', '#384680', '#07080d']
  },
  {
    name: "Violet",    src: "./logos/Violet.jpg",    bg: "#ffffff",    prompt: "Draw Violet Evergarden poster",
    palette:['#e2f8f9', '#b0eef7', '#84d2f3', '#59792c', '#54a7f0', '#3175e6']
  }
  ];

/*
Logo/Pfp: 6
Mascot: 6
Poster: 6
Characters: 6
Misc: 5
*/