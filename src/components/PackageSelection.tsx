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
      </div>
    </div>
  );
};

export default PackageSelection;
