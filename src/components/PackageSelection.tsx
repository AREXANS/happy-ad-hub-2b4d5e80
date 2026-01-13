import { FC } from 'react';
import AdSlider from './AdSlider';
import GlobalBackground from './GlobalBackground';

interface Ad {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link?: string | null;
  link_url?: string | null;
}

interface Package {
  id: string;
  name: string;
  display_name: string;
  price_per_day: number;
  description: string | null;
  features: string[] | null;
  is_active: boolean;
}

interface PackageSelectionProps {
  onSelect: (pkg: 'NORMAL' | 'VIP') => void;
  formatRupiah: (n: number) => string;
  prices: { NORMAL: number; VIP: number };
  ads: Ad[];
  packages?: Package[];
}

const PackageSelection: FC<PackageSelectionProps> = ({ onSelect, formatRupiah, prices, ads, packages }) => {
  const normalPkg = packages?.find(p => p.name === 'NORMAL');
  const vipPkg = packages?.find(p => p.name === 'VIP');

  const normalPrice = normalPkg?.price_per_day ?? prices.NORMAL;
  const vipPrice = vipPkg?.price_per_day ?? prices.VIP;
  const normalFeatures = normalPkg?.features ?? ['Semua fitur dasar', 'Update berkala', 'Support all executor'];
  const vipFeatures = vipPkg?.features ?? ['Semua fitur Normal', 'Premium scripts', 'Priority support', 'Early access features'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 md:p-4 bg-background relative overflow-hidden">
      {/* Global Background */}
      <GlobalBackground />

      <div className="max-w-4xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="relative inline-block mb-3 md:mb-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black gradient-text tracking-wider">
              AREXANS TOOLS
            </h1>
            <span className="absolute -top-1 md:-top-2 -right-2 md:-right-8 bg-primary text-primary-foreground text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 transform rotate-12 rounded shadow-lg border border-primary/50 font-display animate-glow">
              OFFICIAL
            </span>
          </div>
          <p className="text-muted-foreground text-sm md:text-lg">
            Roblox script supports all executors
          </p>
        </div>

        {/* Ad Slider */}
        {ads.length > 0 && (
          <div className="mb-6 md:mb-8">
            <AdSlider ads={ads} />
          </div>
        )}

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Normal Package */}
          <div
            onClick={() => onSelect('NORMAL')}
            className="glass-card p-5 md:p-8 rounded-2xl cursor-pointer group hover:scale-[1.02] transition-all duration-300 border-2 border-transparent hover:border-primary/50 hover:glow-cyan"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <span className="text-primary font-display text-base md:text-lg font-bold">
                {normalPkg?.display_name ?? 'NORMAL'}
              </span>
              <span className="bg-primary/10 text-primary text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full">
                BASIC
              </span>
            </div>
            <div className="mb-4 md:mb-6">
              <span className="text-3xl md:text-4xl font-display font-black text-foreground">
                {formatRupiah(normalPrice)}
              </span>
              <span className="text-muted-foreground text-sm md:text-lg">/hari</span>
            </div>
            <ul className="space-y-2 md:space-y-3 text-muted-foreground text-sm md:text-base">
              {normalFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 md:gap-3">
                  <span className="text-primary">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-6 md:mt-8">
              <button className="btn-primary w-full text-primary-foreground font-display font-bold text-sm md:text-base py-2.5 md:py-3">
                Pilih Normal
              </button>
            </div>
          </div>

          {/* VIP Package */}
          <div
            onClick={() => onSelect('VIP')}
            className="glass-card p-5 md:p-8 rounded-2xl cursor-pointer group hover:scale-[1.02] transition-all duration-300 border-2 border-transparent hover:border-secondary/50 hover:glow-purple relative"
          >
            <div className="absolute -top-2 md:-top-3 -right-2 md:-right-3 bg-secondary text-secondary-foreground text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full font-display animate-glow shadow-lg">
              POPULER
            </div>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <span className="text-secondary font-display text-base md:text-lg font-bold">
                {vipPkg?.display_name ?? 'VIP'}
              </span>
              <span className="bg-secondary/10 text-secondary text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full">
                PREMIUM
              </span>
            </div>
            <div className="mb-4 md:mb-6">
              <span className="text-3xl md:text-4xl font-display font-black text-foreground">
                {formatRupiah(vipPrice)}
              </span>
              <span className="text-muted-foreground text-sm md:text-lg">/hari</span>
            </div>
            <ul className="space-y-2 md:space-y-3 text-muted-foreground text-sm md:text-base">
              {vipFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 md:gap-3">
                  <span className="text-secondary">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-6 md:mt-8">
              <button className="btn-secondary w-full text-secondary-foreground font-display font-bold text-sm md:text-base py-2.5 md:py-3">
                Pilih VIP
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp Icons Footer */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <a
            href="https://chat.whatsapp.com/HlXpv77lO783OUKWeKPaiG"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title="Join Grup WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-[10px]">Grup</span>
          </a>
          
          <a
            href="https://wa.me/6289518030035"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title="Hubungi Admin"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-[10px]">Kontak</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PackageSelection;
