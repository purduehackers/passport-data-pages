import {
  CURRENT_PASSPORT_VERSION,
  IMAGE_GENERATION_SCALE_FACTOR,
} from "@/config";
import { ExpectedData } from "@/lib/generate-data-page";
import { FooterSection } from "./footer";
import { DataSection } from "./data";
import { ImageSection } from "./image";

export async function Passport({
  data,
  url,
}: {
  data: ExpectedData;
  url?: string;
}) {
  let portrait: File;
  if (data.portrait) {
    portrait = data.portrait;
  } else {
    const defaultPortraitUrl = new URL(
      "/passport/no-image.png",
      url ?? "https://passport-data-pages.vercel.app"
    ).href;
    const defaultPortraitRes = await fetch(defaultPortraitUrl);
    const defaultPortraitBlob = await defaultPortraitRes.blob();
    portrait = new File([defaultPortraitBlob], "default_portrait.png", {
      type: "image/png",
    });
  }

  const portraitImageBuffer = Buffer.from(await portrait.arrayBuffer());
  const portraitUrlB64 =
    `data:${portrait.type};base64,` + portraitImageBuffer.toString("base64");

  const dataPageBgUrl = new URL(
    "/passport/data-page-bg.png",
    url ?? "https://passport-data-pages.vercel.app"
  ).href;

  return (
    <div className="w-6">
      <div
        style={{
          fontSize: 13.333 * IMAGE_GENERATION_SCALE_FACTOR,
          fontFamily: '"Inter"',
          color: "black",
          backgroundImage: `url('${dataPageBgUrl}')`,
          backgroundSize: "100% 100%",
          width: "100%",
          height: "100%",
          padding: `${16 * IMAGE_GENERATION_SCALE_FACTOR}px ${
            24 * IMAGE_GENERATION_SCALE_FACTOR
          }px`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            flexDirection: "row",
            position: "absolute",
            top: 24 * IMAGE_GENERATION_SCALE_FACTOR,
            left: 16 * IMAGE_GENERATION_SCALE_FACTOR,
            right: 16 * IMAGE_GENERATION_SCALE_FACTOR,
            gap: 19 * IMAGE_GENERATION_SCALE_FACTOR,
          }}
        >
          <ImageSection imageUrl={portraitUrlB64} />
          <DataSection
            version={CURRENT_PASSPORT_VERSION}
            passportNumber={data.passportNumber}
            id={data.passportNumber}
            surname={data.surname}
            firstName={data.firstName}
            dateOfBirth={data.dateOfBirth}
            dateOfIssue={data.dateOfIssue}
            placeOfOrigin={data.placeOfOrigin}
          />
        </div>
        <FooterSection
          topLine={`PH<HAK${data.surname.replace(
            " ",
            ""
          )}<<${data.firstName.replace(" ", "")}`.padEnd(44, "<")}
          bottomLine={`${String(CURRENT_PASSPORT_VERSION).padStart(
            3,
            "0"
          )}${String(data.passportNumber).padStart(6, "0")}${
            (CURRENT_PASSPORT_VERSION + data.passportNumber) % 10
          }HAK${String(data.dateOfBirth.getFullYear()).padStart(
            4,
            "0"
          )}${String(data.dateOfBirth.getMonth() + 1).padStart(2, "0")}${String(
            data.dateOfBirth.getDate()
          ).padStart(2, "0")}${
            (data.dateOfBirth.getFullYear() +
              data.dateOfBirth.getMonth() +
              data.dateOfBirth.getDate()) %
            10
          }<${String(data.dateOfIssue.getFullYear()).padStart(4, "0")}0101${
            (data.dateOfIssue.getFullYear() + 2) % 10
          }<<<<<<<<<<0${
            (CURRENT_PASSPORT_VERSION +
              data.passportNumber +
              (data.dateOfBirth.getFullYear() +
                data.dateOfBirth.getMonth() +
                data.dateOfBirth.getDate()) +
              (data.dateOfIssue.getFullYear() + 2)) %
            10
          }`}
        />
      </div>
    </div>
  );
}
