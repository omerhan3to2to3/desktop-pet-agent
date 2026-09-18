/**
 * Agent dosya araclari — yalnizca AGENT_WORKSPACE icinde calisir.
 */
const fs = require('fs');
const path = require('path');
const { coz, hazirla } = require('./workspace');

/** OpenAI tools formatinda tanimlar. */
const TANIMLAR = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Calisma klasorundeki dosya ve alt klasorleri listeler.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Alt klasor yolu (bos = kok). Ornek: "notlar" veya "."'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Calisma klasorunde yeni dosya olusturur. Dosya zaten varsa hata verir.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dosya yolu (ornek: "gunluk.txt")' },
          content: { type: 'string', description: 'Baslangic icerigi (bos olabilir)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Calisma klasorundeki bir dosyanin icerigini okur.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dosya yolu' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Dosyaya yazar. append=sonuna ekler, overwrite=tamamen degistirir.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dosya yolu' },
          content: { type: 'string', description: 'Yazilacak metin' },
          mode: {
            type: 'string',
            enum: ['append', 'overwrite'],
            description: 'append (varsayilan) veya overwrite'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Calisma klasorundeki bir dosyayi siler (klasor silmez).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Silinecek dosya yolu' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_file',
      description: 'Dosyayi kullanicinin varsayilan uygulamasinda acar (Word, Not Defteri vb.).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Acilacak dosya yolu' }
        },
        required: ['path']
      }
    }
  }
];

const MAX_OKU = 64 * 1024;

/**
 * @param {string} ad
 * @param {object} args
 * @param {{ root: string, openPath: (p: string) => Promise<string> }} ctx
 */
async function calistir(ad, args, ctx) {
  const root = hazirla(ctx.root);

  switch (ad) {
    case 'list_files': {
      const dir = coz(root, args.path || '.');
      if (!fs.existsSync(dir)) return { ok: false, error: 'Klasor bulunamadi.' };
      const st = fs.statSync(dir);
      if (!st.isDirectory()) return { ok: false, error: 'Bu bir klasor degil.' };
      const girdiler = fs.readdirSync(dir, { withFileTypes: true });
      const liste = girdiler.map((d) => ({
        ad: d.name,
        tur: d.isDirectory() ? 'klasor' : 'dosya'
      }));
      return { ok: true, sonuc: JSON.stringify(liste, null, 2) };
    }

    case 'create_file': {
      const hedef = coz(root, args.path);
      if (fs.existsSync(hedef)) return { ok: false, error: 'Dosya zaten var.' };
      fs.mkdirSync(path.dirname(hedef), { recursive: true });
      fs.writeFileSync(hedef, args.content ?? '', 'utf8');
      return { ok: true, sonuc: `Olusturuldu: ${args.path}` };
    }

    case 'read_file': {
      const hedef = coz(root, args.path);
      if (!fs.existsSync(hedef)) return { ok: false, error: 'Dosya bulunamadi.' };
      const st = fs.statSync(hedef);
      if (!st.isFile()) return { ok: false, error: 'Bu bir dosya degil.' };
      if (st.size > MAX_OKU) {
        return { ok: false, error: `Dosya cok buyuk (>${MAX_OKU} bayt).` };
      }
      return { ok: true, sonuc: fs.readFileSync(hedef, 'utf8') };
    }

    case 'write_file': {
      const hedef = coz(root, args.path);
      const mod = args.mode === 'overwrite' ? 'overwrite' : 'append';
      if (mod === 'append' && !fs.existsSync(hedef)) {
        fs.mkdirSync(path.dirname(hedef), { recursive: true });
        fs.writeFileSync(hedef, args.content ?? '', 'utf8');
      } else if (mod === 'append') {
        fs.appendFileSync(hedef, args.content ?? '', 'utf8');
      } else {
        fs.mkdirSync(path.dirname(hedef), { recursive: true });
        fs.writeFileSync(hedef, args.content ?? '', 'utf8');
      }
      return { ok: true, sonuc: `${mod === 'append' ? 'Eklendi' : 'Yazildi'}: ${args.path}` };
    }

    case 'delete_file': {
      const hedef = coz(root, args.path);
      if (!fs.existsSync(hedef)) return { ok: false, error: 'Dosya bulunamadi.' };
      const st = fs.statSync(hedef);
      if (!st.isFile()) return { ok: false, error: 'Yalnizca dosya silinebilir.' };
      fs.unlinkSync(hedef);
      return { ok: true, sonuc: `Silindi: ${args.path}` };
    }

    case 'open_file': {
      const hedef = coz(root, args.path);
      if (!fs.existsSync(hedef)) return { ok: false, error: 'Dosya bulunamadi.' };
      if (!fs.statSync(hedef).isFile()) return { ok: false, error: 'Bu bir dosya degil.' };
      const hata = await ctx.openPath(hedef);
      if (hata) return { ok: false, error: hata };
      return { ok: true, sonuc: `Acildi: ${args.path}` };
    }

    default:
      return { ok: false, error: `Bilinmeyen arac: ${ad}` };
  }
}

module.exports = { TANIMLAR, calistir };
