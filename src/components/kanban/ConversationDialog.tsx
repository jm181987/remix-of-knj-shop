import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Trash2, ExternalLink } from "lucide-react";
import { generateWhatsAppLink } from "@/lib/whatsapp";

interface ConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: any | null;
  onSaved: () => void;
}

export function ConversationDialog({ open, onOpenChange, conversation, onSaved }: ConversationDialogProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    status: "pending",
    last_message: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (conversation) {
      setFormData({
        customer_name: conversation.customer_name || "",
        customer_phone: conversation.customer_phone || "",
        status: conversation.status || "pending",
        last_message: conversation.last_message || "",
        notes: conversation.notes || "",
      });
    } else {
      setFormData({
        customer_name: "",
        customer_phone: "",
        status: "pending",
        last_message: "",
        notes: "",
      });
    }
  }, [conversation]);

  const handleSave = async () => {
    if (!formData.customer_phone) {
      toast.error("El teléfono es requerido");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        customer_name: formData.customer_name || null,
        customer_phone: formData.customer_phone,
        status: formData.status,
        last_message: formData.last_message || null,
        notes: formData.notes || null,
        last_message_at: new Date().toISOString(),
      };

      if (conversation?.id) {
        const { error } = await supabase
          .from("whatsapp_conversations")
          .update(payload as any)
          .eq("id", conversation.id);
        if (error) throw error;
        toast.success("Conversación actualizada");
      } else {
        const { error } = await supabase
          .from("whatsapp_conversations")
          .insert(payload as any);
        if (error) throw error;
        toast.success("Conversación creada");
      }

      onSaved();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!conversation?.id) return;
    
    if (!confirm("¿Eliminar esta conversación?")) return;

    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .delete()
        .eq("id", conversation.id);
      if (error) throw error;
      toast.success("Conversación eliminada");
      onSaved();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openWhatsApp = () => {
    if (!formData.customer_phone) return;
    const link = generateWhatsAppLink(formData.customer_phone, "");
    window.open(link, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {conversation ? "Editar Conversación" : "Nueva Conversación"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nombre</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_phone">Teléfono *</Label>
            <div className="flex gap-2">
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="+55 11 99999-9999"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={openWhatsApp}
                disabled={!formData.customer_phone}
              >
                <ExternalLink className="w-4 h-4 text-[#25D366]" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Sin Responder</SelectItem>
                <SelectItem value="in_progress">En Proceso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_message">Último Mensaje</Label>
            <Textarea
              id="last_message"
              value={formData.last_message}
              onChange={(e) => setFormData({ ...formData, last_message: e.target.value })}
              placeholder="Resumen del último mensaje..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas Internas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas sobre esta conversación..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            {conversation && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
