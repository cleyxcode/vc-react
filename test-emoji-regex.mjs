import emojiRegex from 'emoji-regex';
const regex = emojiRegex();
const str = "Hello 😊 family 👨‍👩‍👦 and 👍🏿";
let match;
while (match = regex.exec(str)) {
  const emoji = match[0];
  const unified = [...emoji].map(c => c.codePointAt(0).toString(16)).join('-');
  console.log(emoji, unified);
}
