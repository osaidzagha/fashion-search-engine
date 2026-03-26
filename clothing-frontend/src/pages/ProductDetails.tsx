import { useParams } from "react-router-dom";

export default function ProductDetails() {
  // This hook grabs the ":id" from the web address!
  const { id } = useParams();

  return (
    <div className="p-8 text-center mt-20">
      <h1 className="text-3xl font-bold">Product Details Page</h1>
      <p className="text-gray-500 mt-4 text-xl">
        You are looking at the item with ID:{" "}
        <span className="text-black font-mono">{id}</span>
      </p>
    </div>
  );
}
