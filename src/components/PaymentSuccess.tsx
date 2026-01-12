import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import GlobalBackground from './GlobalBackground';

interface PaymentSuccessProps {
  finalData: {
    key: string;
    package: string;
    expired: string;
    expiredDisplay: string;
    days: number;
  };
  onCopy: (text: string) => void;
}

const PaymentSuccess: FC<PaymentSuccessProps> = ({ finalData, onCopy }) => {
  const scriptText = `loadstring(game:HttpGet("https://pastebin.com/raw/rwH3C1Xb"))()`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Global Background */}
      <GlobalBackground variant="success" />

      <div className="glass-card p-8 rounded-2xl max-w-lg w-full border-t-4 border-success relative z-10">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-success/20 animate-float">
            <span className="text-5xl text-success">✓</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            Pembayaran Sukses!
          </h2>
          <p className="text-muted-foreground">
            Akun Anda telah aktif secara otomatis.
          </p>
        </div>

        {/* Account Info */}
        <div className="space-y-4 mb-8">
          <div className="bg-muted/80 p-5 rounded-xl border border-border space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Key:</span>
              <div className="flex items-center gap-2">
                <code className="text-foreground font-mono font-bold">{finalData.key}</code>
                <button
                  onClick={() => onCopy(finalData.key)}
                  className="text-primary hover:text-primary/80 transition-colors p-1 rounded hover:bg-primary/10"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Paket:</span>
              <span className={`font-bold ${finalData.package === 'VIP' ? 'text-secondary' : 'text-primary'}`}>
                {finalData.package}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Durasi:</span>
              <span className="text-foreground font-medium">{finalData.days} Hari</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Berlaku hingga:</span>
              <span className="text-foreground font-medium">{finalData.expiredDisplay}</span>
            </div>
          </div>
        </div>

        {/* Script Section */}
        <div className="bg-muted/50 p-5 rounded-xl border border-border mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Copy script ini ke executor:</p>
          <div className="bg-background p-3 rounded-lg border border-border flex items-center gap-2">
            <code className="text-xs text-primary flex-1 font-mono break-all">
              {scriptText}
            </code>
            <button
              onClick={() => onCopy(scriptText)}
              className="text-primary hover:text-primary/80 transition-colors shrink-0 p-1 rounded hover:bg-primary/10"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="w-full btn-primary text-primary-foreground font-display font-bold"
        >
          Buat Pesanan Baru
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
