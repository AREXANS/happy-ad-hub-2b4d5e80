import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Gift, Tag, ChevronDown } from 'lucide-react';
import GlobalBackground from './GlobalBackground';
import { supabase } from '@/integrations/supabase/client';

interface Discount {
  id: string;
  discount_type: string;
  min_days: number | null;
  max_days: number | null;
  discount_percent: number;
  promo_code: string | null;
  package_name: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

interface OrderFormProps {
  selectedPkg: 'NORMAL' | 'VIP' | null;
  formData: { key: string; duration: string };
  setFormData: (data: { key: string; duration: string }) => void;
  onSubmit: (e: React.FormEvent, promoCode?: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean;
  errorMsg: string;
  formatRupiah: (n: number) => string;
  parseDuration: (input: string) => { days: number; text: string } | null;
  prices: { NORMAL: number; VIP: number };
}

const OrderForm: FC<OrderFormProps> = ({
  selectedPkg,
  formData,
  setFormData,
  onSubmit,
  onBack,
  onGenerate,
  loading,
  errorMsg,
  formatRupiah,
  parseDuration,
  prices
}) => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Discount | null>(null);
  const [promoError, setPromoError] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);

  useEffect(() => {
    const loadDiscounts = async () => {
      const { data } = await supabase
        .from('package_discounts')
        .select('*')
        .eq('is_active', true);
      if (data) setDiscounts(data as Discount[]);
    };
    loadDiscounts();
  }, []);

  const durationData = parseDuration(formData.duration);
  const pricePerDay = selectedPkg === 'VIP' ? prices.VIP : prices.NORMAL;
  const estimatedTotal = durationData ? pricePerDay * durationData.days : 0;

  // Find applicable discount based on duration (with range support)
  const findDurationDiscount = (): Discount | null => {
    if (!durationData) return null;
    const now = new Date();
    
    const durationDiscounts = discounts
      .filter(d => {
        if (d.discount_type !== 'duration_based') return false;
        if (d.min_days === null) return false;
        if (durationData.days < d.min_days) return false;
        // Check max_days if set (range-based discount)
        if (d.max_days !== null && durationData.days > d.max_days) return false;
        if (d.package_name && d.package_name !== selectedPkg) return false;
        if (d.start_date && new Date(d.start_date) > now) return false;
        if (d.end_date && new Date(d.end_date) < now) return false;
        return true;
      })
      .sort((a, b) => (b.min_days || 0) - (a.min_days || 0));

    return durationDiscounts[0] || null;
  };

  const applyPromoCode = () => {
    setPromoError('');
    const now = new Date();
    
    const promo = discounts.find(d => {
      if (d.discount_type !== 'promo_code') return false;
      if (d.promo_code?.toUpperCase() !== promoCode.toUpperCase()) return false;
      if (!d.is_active) return false;
      if (d.package_name && d.package_name !== selectedPkg) return false;
      if (d.start_date && new Date(d.start_date) > now) return false;
      if (d.end_date && new Date(d.end_date) < now) return false;
      return true;
    });

    if (!promo) {
      setPromoError('Kode promo tidak valid atau sudah kadaluarsa');
      setAppliedPromo(null);
      return;
    }

    // Check day range restrictions on promo code
    if (promo.min_days !== null || promo.max_days !== null) {
      if (!durationData) {
        setPromoError('Masukkan durasi terlebih dahulu sebelum menggunakan kode promo');
        setAppliedPromo(null);
        return;
      }
      if (promo.min_days !== null && durationData.days < promo.min_days) {
        const maxText = promo.max_days ? `-${promo.max_days}` : '+';
        setPromoError(`Kode promo ini hanya berlaku untuk pembelian ${promo.min_days}${maxText} hari`);
        setAppliedPromo(null);
        return;
      }
      if (promo.max_days !== null && durationData.days > promo.max_days) {
        setPromoError(`Kode promo ini hanya berlaku untuk pembelian ${promo.min_days}-${promo.max_days} hari`);
        setAppliedPromo(null);
        return;
      }
    }

    setAppliedPromo(promo);
    setPromoError('');
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
    setShowPromoInput(false);
  };

  // Calculate final discount
  const durationDiscount = findDurationDiscount();
  const activeDiscount = appliedPromo || durationDiscount;
  const discountPercent = activeDiscount?.discount_percent || 0;
  const discountAmount = Math.floor(estimatedTotal * (discountPercent / 100));
  const finalTotal = estimatedTotal - discountAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, appliedPromo?.promo_code || undefined);
  };

  // Format discount range text
  const getDiscountRangeText = (d: Discount) => {
    if (d.max_days !== null && d.min_days !== null) {
      return `${d.min_days}-${d.max_days}h`;
    }
    return `${d.min_days}h+`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <GlobalBackground />

      <div className="glass-card p-8 rounded-2xl max-w-md w-full relative shadow-2xl z-10">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 font-medium"
        >
          <span>←</span> Kembali
        </button>

        <div className="text-center mb-8 pt-8">
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 ${
            selectedPkg === 'VIP'
              ? 'bg-secondary/10 text-secondary'
              : 'bg-primary/10 text-primary'
          }`}>
            Paket {selectedPkg}
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Isi Data Pembelian
          </h2>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive p-4 rounded-xl mb-6 text-sm animate-slide-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Kunci Rahasia
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="Masukkan key unik kamu"
                className="flex-1 bg-muted/50 border-border focus:border-primary"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onGenerate}
                className="shrink-0 border-border hover:bg-muted gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Gunakan key unik yang mudah diingat
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Durasi
            </label>
            <Input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Contoh: 7h (hari) atau 1b (bulan)"
              className="bg-muted/50 border-border focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Format: angka + h (hari) atau b (bulan). Contoh: 30h, 1b
            </p>
          </div>

          {/* Promo Code Toggle */}
          {!showPromoInput && !appliedPromo && (
            <button
              type="button"
              onClick={() => setShowPromoInput(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Tag className="w-4 h-4" />
              Punya kode promo?
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {/* Promo Code Input - Only shown when toggled */}
          {(showPromoInput || appliedPromo) && (
            <div className="animate-slide-in">
              <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Kode Promo
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode promo"
                  className="flex-1 bg-muted/50 border-border focus:border-primary font-mono"
                  disabled={!!appliedPromo}
                />
                {appliedPromo ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removePromo}
                    className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    Hapus
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyPromoCode}
                    disabled={!promoCode}
                    className="shrink-0 border-border hover:bg-muted"
                  >
                    Terapkan
                  </Button>
                )}
              </div>
              {promoError && (
                <p className="text-xs text-destructive mt-2">{promoError}</p>
              )}
              {appliedPromo && (
                <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Kode promo berhasil diterapkan: -{appliedPromo.discount_percent}%
                </p>
              )}
            </div>
          )}

          {durationData && (
            <div className="bg-muted/50 p-4 rounded-xl border border-border animate-slide-in">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Durasi:</span>
                <span className="font-medium text-foreground">{durationData.text}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Harga/hari:</span>
                <span className="font-medium text-foreground">{formatRupiah(pricePerDay)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className={`font-medium ${discountPercent > 0 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {formatRupiah(estimatedTotal)}
                </span>
              </div>
              
              {/* Show discount info */}
              {activeDiscount && discountPercent > 0 && (
                <div className="flex justify-between mb-2 text-green-500">
                  <span className="flex items-center gap-1">
                    <Gift className="w-4 h-4" />
                    {activeDiscount.discount_type === 'duration_based' 
                      ? `Diskon (${getDiscountRangeText(activeDiscount)})`
                      : activeDiscount.discount_type === 'promo_code'
                      ? `Promo ${activeDiscount.promo_code}`
                      : 'Diskon'
                    }
                  </span>
                  <span className="font-medium">-{formatRupiah(discountAmount)} ({discountPercent}%)</span>
                </div>
              )}

              {/* Duration discount hint */}
              {!appliedPromo && durationData && !durationDiscount && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                  {discounts
                    .filter(d => d.discount_type === 'duration_based' && d.min_days && (!d.package_name || d.package_name === selectedPkg))
                    .sort((a, b) => (a.min_days || 0) - (b.min_days || 0))
                    .slice(0, 1)
                    .map(d => (
                      <span key={d.id} className="flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        Beli {getDiscountRangeText(d)} untuk diskon {d.discount_percent}%!
                      </span>
                    ))
                  }
                </div>
              )}

              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total:</span>
                  <span className={`font-bold ${selectedPkg === 'VIP' ? 'text-secondary' : 'text-primary'}`}>
                    {formatRupiah(finalTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className={`w-full py-6 font-display font-bold text-lg ${
              selectedPkg === 'VIP' ? 'btn-secondary' : 'btn-primary'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Memproses...
              </span>
            ) : (
              'Lanjut ke Pembayaran'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;