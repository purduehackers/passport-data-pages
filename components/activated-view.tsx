import { Passport } from "@/types/types";
import Image from "next/image";
import { ImageActions } from "./image-actions";
import Link from "next/link";
import { Button } from "./ui/button";

export function ActivatedView({
  userId,
  latestPassport,
}: {
  userId: string | undefined;
  latestPassport: Passport;
}) {
  const latestPassportImageUrl = `${process.env.R2_PUBLIC_URL}/${latestPassport.id}.png`;
  return (
    <>
      <div className="flex flex-col gap-2 w-full md:w-9/12 mx-auto">
        <div className="bg-slate-200 text-black rounded-sm border-[3px] border-amber-400 flex flex-col justify-center gap-2 p-2 sm:p-4 my-4 break-inside-avoid shadow-amber-500 shadow-blocks-sm font-main">
          <h1 className="font-bold text-3xl sm:text-6xl mx-auto mb-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
            <img
              alt="passport cover"
              src="/cover-black.svg"
              className="self-center flex-shrink-0 h-16 sm:h-[1em] w-auto pointer-events-none"
            />
            Your Passport
          </h1>
          <p className="text-base">
            Your passport is activated! Here&rsquo;s the data page you
            generated. You can download it, share it, or make a new one.
          </p>
        </div>
        <div className="w-full md:w-8/12 mx-auto flex flex-col gap-2">
          <Image
            alt={`Passport for discord id ${latestPassport.id}`}
            src={latestPassportImageUrl}
            width={0}
            height={0}
            sizes="100vw"
            style={{
              width: "auto",
              height: "auto",
              borderRadius: "8px",
            }}
          />
          <ImageActions
            generatedImageUrl={latestPassportImageUrl}
            userId={userId}
            latestPassport={latestPassport}
            firstName={latestPassport.name}
            surname={latestPassport.surname}
          />
        </div>
      </div>
      <div className="bg-slate-200 text-black rounded-sm border-[3px] border-red-400 flex flex-col justify-center w-full md:w-7/12 gap-2 p-2 sm:p-4 my-4 mx-auto break-inside-avoid shadow-red-500 shadow-blocks-sm font-main">
        <h1 className="font-bold text-center text-2xl">Make a new passport?</h1>
        <p>
          Your current passport is activated. You can make a new passport at any
          time. We are resource-constrained, though, so please only do so if you
          feel like you need a new one or there&rsquo;s a problem with your
          current one!
        </p>
        <Link href="/?new=true" className="mx-auto mt-2">
          <Button type="button" className="font-bold">
            New Passport
          </Button>
        </Link>
      </div>
    </>
  );
}