import { FC, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, MessageCircle, AlertCircle, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import GlobalBackground from './GlobalBackground';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SocialLink {
  id: string;
  name: string;
  icon_type: string;
  url: string;
  label: string;
  is_active: boolean;
}

interface PaymentQRProps {
  paymentData: {
    transactionId: string;
    qr_string: string;
    qris_url: string;
    qr_fallback_url?: string;
    totalAmount: number;
    expiresAt: string;
  };
  statusMsg: string;
  errorMsg: string;
  onCancel: () => void;
  onCopy: (text: string) => void;
  formatRupiah: (n: number) => string;
  claimable?: boolean;
  claimLoading?: boolean;
  onClaim?: () => void;
}

const PaymentQR: FC<PaymentQRProps> = ({
  paymentData,
  statusMsg,
  errorMsg,
  onCancel,
  onCopy,
  formatRupiah,
  claimable = false,
  claimLoading = false,
  onClaim
}) => {
  const [showContactHint, setShowContactHint] = useState(false);
  const [contactLink, setContactLink] = useState<SocialLink | null>(null);
  const [qrImageError, setQrImageError] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContactHint(true);
    }, 30000);

    const fetchContactLink = async () => {
      const { data } = await supabase
        .from('social_links')
        .select('*')
        .eq('is_active', true)
        .or('icon_type.eq.whatsapp-contact,icon_type.eq.whatsapp')
        .order('sort_order')
        .limit(1);

      if (data && data.length > 0) {
        setContactLink(data[0] as SocialLink);
      }
    };

    fetchContactLink();

    return () => clearTimeout(timer);
  }, []);

  // Handle QR image error - fallback to secondary URL
  const handleQrError = () => {
    if (!qrImageError && paymentData.qr_fallback_url) {
      console.log('Primary QR failed, using fallback URL');
      setQrImageError(true);
    }
  };

  // Get the appropriate QR URL
  const getQrUrl = () => {
    if (qrImageError && paymentData.qr_fallback_url) {
      return paymentData.qr_fallback_url;
    }
    return paymentData.qris_url || 
      `https://larabert-qrgen.hf.space/v1/create-qr-code?size=500x500&style=2&color=0D8BA5&data=${encodeURIComponent(paymentData.qr_string)}`;
  };

  // Handle file selection for proof image
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Ukuran file maksimal 5MB', variant: 'destructive' });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'File harus berupa gambar', variant: 'destructive' });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit proof image
  const handleSubmitProof = async () => {
    if (!proofImage) {
      toast({ title: 'Error', description: 'Pilih gambar bukti pembayaran terlebih dahulu', variant: 'destructive' });
      return;
    }

    setUploadingProof(true);

    try {
      // Update transaction with proof image
      const { error } = await supabase
        .from('transactions')
        .update({ proof_image: proofImage })
        .eq('transaction_id', paymentData.transactionId);

      if (error) {
        console.error('Error uploading proof:', error);
        toast({ title: 'Error', description: 'Gagal mengunggah bukti pembayaran', variant: 'destructive' });
      } else {
        setProofSubmitted(true);
        toast({ 
          title: 'Berhasil!', 
          description: 'Bukti pembayaran telah dikirim ke admin. Tunggu konfirmasi.' 
        });
      }
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setUploadingProof(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <GlobalBackground />

      <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center z-10 relative">
        <h2 className="text-2xl font-display font-bold mb-2 text-foreground">
          Scan untuk Membayar
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          QRIS mendukung Dana, OVO, GoPay, ShopeePay, dll
        </p>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive p-4 rounded-xl mb-6 text-sm">
            {errorMsg}
          </div>
        )}

        {/* QR Code */}
        <div className="bg-foreground p-4 rounded-2xl mb-6 inline-block shadow-xl glow-cyan">
          <img
            src={getQrUrl()}
            alt="QRIS Code"
            className="w-64 h-64 rounded-lg"
            crossOrigin="anonymous"
            onError={handleQrError}
          />
        </div>

        {/* Amount */}
        <div className="bg-muted/50 p-4 rounded-xl mb-6 border border-border">
          <p className="text-muted-foreground text-sm mb-1">Total Pembayaran</p>
          <p className="text-3xl font-display font-bold text-primary">
            {formatRupiah(paymentData.totalAmount)}
          </p>
        </div>

        {/* Status */}
        {statusMsg && (
          <div className="flex items-center justify-center gap-3 mb-6 text-warning">
            <div className="w-3 h-3 bg-warning rounded-full animate-pulse" />
            <span className="font-medium">{statusMsg}</span>
          </div>
        )}

        {/* Contact Hint & Proof Upload Option */}
        {showContactHint && (
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-left w-full">
                <p className="text-sm text-foreground font-medium mb-2">
                  Sudah bayar tapi status belum berubah?
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload bukti pembayaran dan tunggu admin untuk verifikasi manual.
                </p>
                
                {!showProofUpload ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowProofUpload(true)}
                      className="text-primary border-primary/30"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Bukti
                    </Button>
                    {contactLink && (
                      <a
                        href={contactLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-success/20 hover:bg-success/30 text-success px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Hubungi Admin
                      </a>
                    )}
                  </div>
                ) : proofSubmitted ? (
                  <div className="bg-success/20 p-3 rounded-lg text-success text-sm">
                    ✅ Bukti pembayaran telah dikirim! Tunggu konfirmasi admin.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {proofImage ? (
                      <div className="relative">
                        <img 
                          src={proofImage} 
                          alt="Bukti pembayaran" 
                          className="w-full h-32 object-cover rounded-lg border border-border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setProofImage(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors"
                      >
                        <ImageIcon className="w-8 h-8 text-primary/50 mb-2" />
                        <span className="text-xs text-muted-foreground">Klik untuk pilih gambar</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSubmitProof}
                        disabled={!proofImage || uploadingProof}
                        className="flex-1"
                      >
                        {uploadingProof ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Kirim Bukti
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowProofUpload(false);
                          setProofImage(null);
                        }}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction ID */}
        <div className="bg-muted/30 p-3 rounded-lg mb-6">
          <p className="text-xs text-muted-foreground mb-1">ID Transaksi</p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-xs text-foreground font-mono">
              {paymentData.transactionId}
            </code>
            <button
              onClick={() => onCopy(paymentData.transactionId)}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Claim Section */}
        {claimable && (
          <div className="bg-success/10 border border-success/30 p-5 rounded-xl mb-6 animate-slide-in">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-success/20 flex items-center justify-center ring-4 ring-success/20">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-bold text-success mb-2">Pembayaran Terverifikasi!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Admin telah memverifikasi pembayaran Anda. Klik tombol di bawah untuk mengklaim key Anda. 
                <span className="text-foreground font-medium"> Durasi key akan dimulai dari saat Anda mengklaim.</span>
              </p>
              <Button
                onClick={onClaim}
                disabled={claimLoading}
                className="w-full py-4 font-display font-bold text-lg bg-success hover:bg-success/90 text-success-foreground"
              >
                {claimLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengklaim Key...
                  </span>
                ) : (
                  '🎉 Klaim Key Sekarang'
                )}
              </Button>
            </div>
          </div>
        )}

        {!claimable && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          >
            Batalkan Pesanan
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentQR;