export const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-64 w-full">
      <div className="relative w-10 h-10">
        {/* Static background ring */}
        <div className="absolute inset-0 rounded-full border border-borderLight dark:border-borderLight-dark transition-colors duration-500 ease-smooth" />

        {/* 
          Animated arc. 
          We use Tailwind's native linear animate-spin to prevent stuttering.
        */}
        <div className="absolute inset-0 rounded-full border border-transparent border-t-textPrimary dark:border-t-textPrimary-dark animate-spin transition-colors duration-500 ease-smooth" />
      </div>
    </div>
  );
};
