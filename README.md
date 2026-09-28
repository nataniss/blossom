<div align="center">
    <h1><b>BlossomBot</b></h1>
</div>

BlossomBot is a WhatsApp bot with various built-in feaures, that uses the Baileys library for Node.JS.

## **Features**
### 📺 Media
BlossomBot allows users to search YouTube for videos and songs, and allows creating stickers from and to images, GIFs, and videos.
### 🏆 Leveling
BlossomBot has a leveling system, which tracks and ranks the most active users inside a group.
### ⚙️ Moderation
BlossomBot allows group administrators to control their group and automate certain actions, such as banning users and closing/opening the group.
### *... and more to come!*

## **Installation**
### Requirements
Make sure you have the following:
- **Node.JS** - 20.0.0 or later
- **NPM**
- **Any WhatsApp account**

These are optional, but extend BlossomBot functionality:
- **FFMPEG** `(for /play* and /s*)`
- **YT-DLP** `(for /play*)`

### Installation
Download this repository, either by cloning it with `git` if you have it:
```bash
git clone https://github.com/nataniss/blossom.git
cd blossom
```
or by clicking `Code` > `Download ZIP` from the [Repository](https://github.com/nataniss/blossom) Github website.<br>
Enter the folder where you cloned/extracted the bot, then install the necessary dependecies:
```bash
npm i
```

After that, start BlossomBot:
```bash
node index.js
```

Follow the steps on screen to configure the bot for the first time.