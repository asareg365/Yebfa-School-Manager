import { ai } from "./genkit";

async function main() {
  try {
    const res = await ai.generate({
      prompt: "Say hello.",
    });

    console.log(res.text);
  } catch (e) {
    console.error(e);
  }
}

main();
