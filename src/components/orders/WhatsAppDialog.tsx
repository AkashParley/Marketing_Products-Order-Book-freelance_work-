import { useState } from "react";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { whatsappShareUrl } from "@/lib/whatsapp";
import { useToast } from "@/components/ui/toast";

/**
 * Generic WhatsApp preview dialog — takes an already-built message string so
 * it works equally for a full order, a single loading, saved or unsaved.
 */
export function WhatsAppDialog({
  message,
  phone,
  open,
  onOpenChange,
}: {
  message: string | null;
  phone?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message as string);
      setCopied(true);
      toast("Message copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Could not copy — select the text manually", "error");
    }
  }

  function handleOpen() {
    window.open(whatsappShareUrl(message as string, phone), "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand-600" /> WhatsApp preview
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-line bg-paper-dim p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">{message}</pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            <Copy /> {copied ? "Copied" : "Copy Message"}
          </Button>
          <Button onClick={handleOpen}>
            <ExternalLink /> Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
