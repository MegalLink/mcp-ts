// Test temporal para debuggear el problema

const mockHtml = `
  <html>
    <body>
      <a href="https://example.com">Home</a>
      <a href="/docs">Docs</a>
      <a href="./guide">Guide</a>
      <a href="../help">Help</a>
    </body>
  </html>
`;

// Simular lo que está pasando en el test
const urls = [];

console.log('Test que podría estar fallando:');
console.log('urls[0]:', 'https://example.com/'); // Lo que está devolviendo
console.log('Expected:', 'https://example.com'); // Lo que espera el test
console.log('Match:', 'https://example.com/' === 'https://example.com'); // false
