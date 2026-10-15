import fs from 'fs';
import path from 'path';

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const key = line.substring(0, line.indexOf('=')).trim();
      if (key) keys.add(key);
    }
  }
  return keys;
}

export function envValidatorPlugin({ exampleFile = '.env.example' } = {}) {
  return {
    name: 'vite-plugin-env-validator',
    configResolved(config) {
      const root = config.root || process.cwd();
      const appEnv = process.env.APP_ENV || process.env.VITE_APP_ENV;
      const isDeploy =
        appEnv === 'deploy' ||
        appEnv === 'production' ||
        process.env.NODE_ENV === 'production' ||
        Boolean(process.env.VERCEL) ||
        Boolean(process.env.RENDER);

      if (isDeploy) {
        console.log('🚀 [Frontend] Đang ở môi trường DEPLOY/PRODUCTION: Bỏ qua kiểm tra file .env cục bộ.');
        return;
      }

      const envPath = path.resolve(root, '.env');
      const examplePath = path.resolve(root, exampleFile);

      if (!fs.existsSync(envPath)) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ LỖI FRONTEND: Không tìm thấy file .env!');
        if (fs.existsSync(examplePath)) {
          console.error(`👉 Vui lòng tạo file .env từ ${exampleFile}`);
          console.error(`   Lệnh: cp ${exampleFile} .env`);
        }
        console.error('='.repeat(70) + '\n');
        throw new Error('Thiếu file .env trong aives-frontend!');
      }

      if (fs.existsSync(examplePath)) {
        const exampleKeys = parseEnvKeys(examplePath);
        const envKeys = parseEnvKeys(envPath);

        const missingInEnv = [...exampleKeys].filter((k) => !envKeys.has(k));
        if (missingInEnv.length > 0) {
          console.error('\n' + '='.repeat(70));
          console.error('❌ LỖI ĐỒNG BỘ: File .env thiếu biến so với .env.example!');
          console.error('   Các biến cần bổ sung vào .env:');
          missingInEnv.forEach((k) => console.error(`   - ${k}`));
          console.error(`👉 Vui lòng cập nhật .env theo ${exampleFile}`);
          console.error('='.repeat(70) + '\n');
          throw new Error(`File .env thiếu các biến: ${missingInEnv.join(', ')}`);
        }

        const missingInExample = [...envKeys].filter((k) => !exampleKeys.has(k));
        if (missingInExample.length > 0) {
          console.warn('\n⚠️  CẢNH BÁO: Phát hiện biến mới trong .env chưa có trong .env.example:');
          missingInExample.forEach((k) => console.warn(`   - ${k}`));
          console.warn('👉 Nhớ cập nhật lại .env.example để chia sẻ cho cả team!\n');
        }
      }
    },
  };
}
