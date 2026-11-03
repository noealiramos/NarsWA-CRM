// Ejecutable falso de `claude` para las pruebas (ADR-004). Se corre con process.execPath y
// este script en `argsPrefix`; el modo se elige con la variable FAKE_MODE. Nunca llama a un LLM.
const mode = process.env.FAKE_MODE ?? 'ok';

let stdin = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) stdin += chunk;

const print = (value) => process.stdout.write(typeof value === 'string' ? value : JSON.stringify(value));
const success = { is_error: false, subtype: 'success', stop_reason: 'end_turn' };

switch (mode) {
  case 'ok':
    // Devuelve en `result` lo que recibió, para que la prueba lo inspeccione.
    print({
      ...success,
      result: JSON.stringify({
        argv: process.argv.slice(2),
        stdin,
        cwd: process.cwd(),
        hasApiKey: 'ANTHROPIC_API_KEY' in process.env,
      }),
      usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 2, cache_read_input_tokens: 3 },
      total_cost_usd: 0.0123,
      duration_ms: 900,
    });
    break;
  case 'padded':
    print({ ...success, result: '  \n  Hola, soy Fuerza Gym.  \n', usage: { input_tokens: 1, output_tokens: 1 } });
    break;
  case 'no_usage':
    print({ ...success, result: 'ok' });
    break;
  case 'is_error':
    print({
      is_error: true,
      subtype: 'error_during_execution',
      result: 'límite alcanzado',
      api_error_status: Number(process.env.FAKE_STATUS) || undefined,
    });
    process.exitCode = Number(process.env.FAKE_EXIT ?? 0);
    break;
  case 'not_json':
    print('esto no es json');
    break;
  case 'exit1':
    process.stderr.write('fallo interno del cli');
    process.exitCode = 1;
    break;
  case 'empty':
    print({ ...success, result: '   ' });
    break;
  case 'max_tokens':
    print({ ...success, stop_reason: 'max_tokens', result: 'texto a medias' });
    break;
  case 'bad_schema':
    print({ ...success, foo: 1 });
    break;
  case 'flood':
    print({ ...success, result: 'x'.repeat(100000) });
    break;
  case 'leak_error':
    // Repite system (argv) y lead (stdin) tras 400 caracteres de relleno: el clip de 300 los corta.
    print({ is_error: true, subtype: 'error_during_execution', result: `${'r'.repeat(400)} ${process.argv.slice(2).join(' ')} ${stdin}` });
    break;
  case 'leak_exit1':
    process.stderr.write(`${'e'.repeat(400)} ${process.argv.slice(2).join(' ')} ${stdin}`);
    process.exitCode = 1;
    break;
  case 'hang':
    setInterval(() => {}, 1000);
    break;
  default:
    process.exitCode = 2;
}
