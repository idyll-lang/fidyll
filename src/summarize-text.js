
const OpenAI = require('openai-api');

// Load your key from an environment variable or secret management service
// (do not include your key directly in your code)
const OPENAI_API_KEY = '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';

const openai = new OpenAI(OPENAI_API_KEY);

module.exports = async (text) => {

    // console.log('summarizing', text)
    console.log('\n\nprompt', `
The high-schooler asked me what this passage means:
"""
${text}
"""
I rephrased it for him, in plain language a high-schooler can understand:
"""
    `);
    const gptResponse = await openai.complete({
      engine: 'davinci',
      prompt: `
The high-schooler asked me what this passage means:
"""
${text}
"""
I rephrased it for him, in plain language a high-schooler can understand:
"""
      `,
      maxTokens: 60,
      temperature: 0.0,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      bestOf: 1,
      n: 1,
      stream: false,
      stop: ["\"\"\""]
  });

  console.log("summary results", gptResponse);

  return gptResponse.daata;

}
