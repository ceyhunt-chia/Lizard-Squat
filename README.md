# ZARD Stake

Robinhood Chain üzerinde çalışan, kilit süresine göre kademeli ödül veren staking uygulaması.

## İçerik

- `contracts/ZardStakingPool.sol` — staking kontratı (sabit ödül havuzu, 4 kilit tier'ı, timelock'lu parametre değişimi)
- `frontend/` — React + Vite + wagmi + RainbowKit arayüzü

## 1. Kontratı Deploy Etme

1. `contracts/ZardStakingPool.sol` dosyasını Remix'e yükle (aynı ZARD token'ı deploy ettiğin gibi)
2. OpenZeppelin bağımlılıklarını Remix otomatik çeker (import satırları üzerinden)
3. Constructor parametreleri:
   - `_stakingToken`: ZARD token kontrat adresin
   - `_baseRewardRateBps`: taban yıllık APY, bps cinsinden (örn. `1000` = %10)
   - `_maxTotalStaked`: havuza kabul edilecek maksimum toplam stake miktarı (wei cinsinden, güvenlik tavanı)
4. Deploy sonrası **ödül havuzunu doldur**: `fundRewardPool(amount)` çağırmadan önce staking kontratına `approve` vermen gerekir (ZARD kontratında `approve(stakingPoolAddress, amount)`)
5. Deploy adresini not al — frontend'de kullanılacak

## 2. Frontend Kurulumu

```bash
cd frontend
npm install
```

`src/abi/ZardStakingPool.ts` dosyasında şu iki satırı güncelle:

```ts
export const ZARD_TOKEN_ADDRESS = "0xSENIN_ZARD_ADRESIN" as const;
export const STAKING_POOL_ADDRESS = "0xSENIN_STAKING_KONTRAT_ADRESIN" as const;
```

`src/lib/wagmi.ts` dosyasında `projectId`'yi güncelle — [cloud.walletconnect.com](https://cloud.walletconnect.com) üzerinden ücretsiz alınır.

Lokal çalıştırma:

```bash
npm run dev
```

## 3. Canlıya Alma

- **Vercel/Netlify**: repo'yu GitHub'a push et, Vercel'e bağla, otomatik build alır (`npm run build`)
- **Lovable'a aktarma**: GitHub reposunu Lovable projesine sync ederek arayüz/tasarım kısmını orada görsel olarak düzenlemeye devam edebilirsin — web3 mantığı (wagmi hook'ları, kontrat çağrıları) zaten hazır kod olarak repoda duruyor, Lovable bunu bozmadan üstüne UI değişikliği yapabilir

## Tokenomics Bölümü

`src/components/TokenomicsSection.tsx` — dağılım grafiği ve tablosu (statik veri, ALLOCATIONS dizisinden düzenlenir).
`src/components/LiveSupplyStats.tsx` — zincirden canlı okunan toplam arz / kilitli arz / kilitli oran paneli.

Dağılım oranlarını değiştirmek istersen `TokenomicsSection.tsx` içindeki `ALLOCATIONS` dizisini güncellemen yeterli.

## Önemli Güvenlik Notları

- Mainnet'e geçmeden önce kontrat **bağımsız audit'ten geçmeli**
- Owner cüzdanı (parametre değişimi, pause yetkisi) **tek bir cüzdan değil, Gnosis Safe multisig olmalı**
- `maxTotalStaked` düşük başlatılıp güven oluştukça artırılmalı
- Frontend'deki `approve` miktarı kullanıcının girdiği tam miktar — "sonsuz approve" kullanılmıyor, her stake işleminde kullanıcı ne kadar approve ettiğini görüyor (kullanıcı güvenliği için bilinçli tercih)
