import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import GlobalBackground from './GlobalBackground';

interface PaymentQRProps {
  paymentData: {
    transactionId: string;
    qr_string: string;
    qris_url: string;
    totalAmount: number;
    expiresAt: string;
  };
  statusMsg: string;
  errorMsg: string;
  onCancel: () => void;
  onCopy: (text: string) => void;
  formatRupiah: (n: number) => string;
}

const PaymentQR: FC<PaymentQRProps> = ({
  paymentData,
  statusMsg,
  errorMsg,
  onCancel,
  onCopy,
  formatRupiah
}) => {
  const qrUrl = paymentData.qris_url ||
    `https://larabert-qrgen.hf.space/v1/create-qr-code?size=500x500&style=2&color=0D8BA5&data=${encodeURIComponent(paymentData.qr_string)}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Global Background */}
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
            src={qrUrl}
            alt="QRIS Code"
            className="w-64 h-64 rounded-lg"
            crossOrigin="anonymous"
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

        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          Batalkan Pesanan
        </Button>
      </div>
    </div>
  );
};

export default PaymentQR;
