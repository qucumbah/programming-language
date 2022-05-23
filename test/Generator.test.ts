import { generateModuleSample } from './generatorUtil.ts'

Deno.test('Generate full module correctly', async function(test: Deno.TestContext) {
  const samples: string[] = [
    // 'lex-test',
    // 'parse-test',
    // 'validation-test',
    'generation-test',
    // 'pointers-test',
    'unsigned-and-64bit-test',
  ];

  for (const sample of samples) {
    const filePath: string = `./examples/${sample}.ltctwa`;
    await test.step(`Generates ${filePath}`, function() {
      const sampleContent: string = Deno.readTextFileSync(filePath);
      generateModuleSample(sampleContent);
    });
  }
});
