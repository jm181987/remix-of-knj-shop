-- Create table for WhatsApp conversations tracking
CREATE TABLE public.whatsapp_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage whatsapp conversations" 
ON public.whatsapp_conversations 
FOR ALL
USING (public.is_admin_or_superadmin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for WhatsApp notification log
CREATE TABLE public.whatsapp_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status_from TEXT,
    status_to TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view whatsapp notifications" 
ON public.whatsapp_notifications 
FOR SELECT
USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can insert whatsapp notifications" 
ON public.whatsapp_notifications 
FOR INSERT
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));