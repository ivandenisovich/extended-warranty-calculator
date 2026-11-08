// Phone mockup frame: dark navy border, rounded corners, white screen.
export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[2.5rem] bg-tc-navy p-2.5 shadow-xl">
      <div className="rounded-[2rem] bg-tc-bg overflow-hidden">{children}</div>
    </div>
  );
}
