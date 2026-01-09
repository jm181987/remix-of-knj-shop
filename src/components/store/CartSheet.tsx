import { ShoppingCart, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function CartSheet() {
  const { items, totalItems, totalPrice, updateQuantity, removeItem } =
    useCartContext();
  const { t } = useLanguage();
  const { formatAmount } = useCurrencyContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleCheckout = () => {
    setOpen(false);
    navigate("/checkout");
  };

  const getItemDisplayName = (item: typeof items[0]) => {
    const variantParts = [item.size, item.color].filter(Boolean);
    if (variantParts.length > 0) {
      return `${item.name} (${variantParts.join(" / ")})`;
    }
    return item.name;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("cart.title")} ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 opacity-30" />
            <p>{t("cart.empty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.id}_${item.variant_id || 'base'}`}
                    className="flex gap-3 rounded-lg border border-border/50 bg-card/50 p-3"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-md bg-muted/30">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <h4 className="line-clamp-2 font-medium text-sm">
                        {getItemDisplayName(item)}
                      </h4>
                      <span className="text-sm text-primary">
                        {formatAmount(item.price)}
                      </span>
                      <div className="mt-auto flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1, item.variant_id)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1, item.variant_id)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.id, item.variant_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter className="flex-col gap-4 border-t border-border/50 pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t("cart.total")}:</span>
                <span className="text-primary">{formatAmount(totalPrice)}</span>
              </div>
              <Button onClick={handleCheckout} className="w-full" size="lg">
                {t("cart.checkout")}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}