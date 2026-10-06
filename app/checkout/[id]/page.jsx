import { getOrder } from "@/lib/orders";
import CheckoutView from "@/components/CheckoutView";

export const dynamic = "force-dynamic";

export default function CheckoutPage({ params }) {
  const order = getOrder(params.id);
  if (!order) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h1 className="section-title">Заказ не найден</h1>
        <p className="muted">Возможно, ссылка устарела.</p>
        <a href="/shop" className="btn" style={{ marginTop: 16 }}>
          В магазин
        </a>
      </div>
    );
  }
  return <CheckoutView order={order} />;
}
