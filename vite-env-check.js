import fs from 'fs';
import path from 'path';

export function envValidatorPlugin({ requiredVars = [], exampleFile = '.env.example' } = {}) {
  return {
    name: 'vite-plugin-env-validator',
    configResolved(config) {
      const root = config.root || process.cwd();
      const envPath = path.resolve(root, '.env');
      const examplePath = path.resolve(root, exampleFile);

      if (!fs.existsSync(envPath)) {
        console.warn('\n' + '='.repeat(70));
        console.warn('⚠️  CẢNH BÁO FRONTEND: Không tìm thấy file .env!');
        if (fs.existsSync(examplePath)) {
          console.warn(`👉 Vui lòng tạo file .env từ ${exampleFile}`);
          console.warn(`   Lệnh: cp ${exampleFile} .env`);
        }
        console.warn('='.repeat(70) + '\n');
      }
    },
  };
}
