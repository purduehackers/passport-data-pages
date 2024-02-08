"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { processImage } from "@/lib/process-image";
import { Crop } from "./crop";
import { useRef, useState } from "react";
import { ImageResponse } from "next/og";
import { Checkbox } from "./ui/checkbox";
import { createPassport, uploadImageToR2 } from "@/lib/actions";
import {
  GenerationStatus,
  GenerationStep,
  GenerationStepId,
  Passport,
} from "@/types/types";
import { formatDefaultDate } from "@/lib/format-default-date";
import { GENERATION_STEPS } from "@/config";
import { CheckCircle } from "lucide-react";

const ORIGINS = ["The woods", "The deep sea", "The tundra"];

const maxDate = new Date();

const FormSchema = z.object({
  surname: z.string().min(1, {
    message: "Name must be at least 1 character.",
  }),
  firstName: z.string().min(1, {
    message: "Name must be at least 1 character.",
  }),
  placeOfOrigin: z.string().max(13),
  dateOfBirth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format. Please enter a valid date.",
    })
    .refine(
      (val) => {
        const inputDate = new Date(val);
        return inputDate < maxDate;
      },
      {
        message: "Date of birth cannot be later than today.",
      }
    ),
  image: z.custom<File>((val) => val instanceof File, "Please upload a file"),
  passportNumber: z.string().max(4).optional(),
  sendToDb: z.boolean().optional().default(false),
});

export default function Playground({
  userId,
  latestPassport,
  latestPassportImageUrl,
}: {
  userId: string | undefined;
  latestPassport: Passport | null | undefined;
  latestPassportImageUrl: string | null;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      firstName: latestPassport?.name || "",
      surname: latestPassport?.surname || "",
      dateOfBirth: latestPassport
        ? formatDefaultDate(latestPassport.date_of_birth)
        : undefined,
      placeOfOrigin: latestPassport?.place_of_origin || ORIGINS[0],
      image: undefined,
      passportNumber: "0",
    },
  });

  const [generatedImageUrl, setGeneratedImageUrl] = useState(
    latestPassportImageUrl || "/passport/default.png"
  );
  const [isDefaultImage, setIsDefaultImage] = useState(
    generatedImageUrl === "/passport/default.png" ? true : false
  );
  const [isLoading, setIsLoading] = useState(false); // TODO: do this better
  const [croppedImageFile, setCroppedImageFile] = useState<File>();
  const generatedImageRef = useRef(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>(
    GENERATION_STEPS.base
  );

  function updateGenerationStepState(
    stepId: GenerationStepId,
    status: GenerationStatus
  ) {
    setGenerationSteps((currentSteps) =>
      currentSteps.map((step) =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  }

  function resetGenerationSteps() {
    setGenerationSteps((currentSteps) =>
      currentSteps.map((step) => {
        return { ...step, status: "pending" };
      })
    );
  }

  function generateDownloadName() {
    const { firstName, surname } = form.getValues();

    function processName(name: string) {
      return name.replace(" ", "_").toLowerCase();
    }
    return `passport_${processName(firstName)}_${processName(surname)}`;
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);

    let generatedPassportNumber = data.passportNumber || "0";

    if (!croppedImageFile) {
      return; // TODO: handle error
    }
    const imageData = await processImage(croppedImageFile);
    updateGenerationStepState("processing_portrait", "completed");

    const apiFormData = new FormData();
    for (const [key, val] of Object.entries(data)) {
      if (key !== "image") {
        apiFormData.append(key, String(val));
      }
    }
    apiFormData.append("portrait", imageData);
    if (userId) {
      apiFormData.append("userId", userId);
    }

    if (data.sendToDb) {
      const { passportNumber } = await createPassport(apiFormData);
      generatedPassportNumber = String(passportNumber);
      apiFormData.set("passportNumber", String(passportNumber));

      updateGenerationStepState("assigning_passport_number", "completed");
    }

    // todo: use promise.all
    const postRes: ImageResponse = await fetch(`/api/generate-full-frame`, {
      method: "POST",
      body: apiFormData,
    });
    const generatedImageBlob = await postRes.blob();
    const generatedImageFile = new File([generatedImageBlob], "data_page.png", {
      type: "image/png",
    });

    let fullFrameFile: File | null = null;

    if (data.sendToDb) {
      const fullFrameRes: ImageResponse = await fetch(
        `/api/generate-full-frame`,
        {
          method: "POST",
          body: apiFormData,
        }
      );
      const fullFrameBlob = await fullFrameRes.blob();
      fullFrameFile = new File([fullFrameBlob], "data_page.png", {
        type: "image/png",
      });
    }
    updateGenerationStepState("generating", "completed");

    if (data.sendToDb) {
      apiFormData.append("generatedImage", generatedImageFile);
      apiFormData.append("fullFrameImage", fullFrameFile!);

      await Promise.all([
        uploadImageToR2("generated", apiFormData, generatedPassportNumber),
        uploadImageToR2("full", apiFormData, generatedPassportNumber),
      ]);

      updateGenerationStepState("uploading", "completed");
    }

    const generatedImageBuffer = Buffer.from(
      await generatedImageBlob.arrayBuffer()
    );
    const generatedImageUrl =
      "data:image/png;base64," + generatedImageBuffer.toString("base64");
    updateGenerationStepState("summoning_elves", "completed");

    setGeneratedImageUrl(generatedImageUrl);
    setIsLoading(false);
    setIsDefaultImage(false);
    resetGenerationSteps();
  }

  return (
    <main className="grid lg:grid-cols-[2fr_3fr] gap-20 lg:gap-12 w-full max-w-4xl">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-y-6"
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input placeholder="Wack" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="surname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input placeholder="Hacker" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="placeOfOrigin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place of origin</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    {ORIGINS.map((origin) => (
                      <FormItem
                        key={origin}
                        className="flex-row items-center gap-x-2"
                      >
                        <FormControl>
                          <RadioGroupItem value={origin} />
                        </FormControl>
                        <FormLabel className="font-normal">{origin}</FormLabel>
                      </FormItem>
                    ))}
                    <FormItem className="flex-row items-center gap-x-2">
                      <FormControl>
                        <RadioGroupItem value="" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Write your own…
                      </FormLabel>
                    </FormItem>
                    {!ORIGINS.includes(form.getValues().placeOfOrigin) && (
                      <div className="pl-6">
                        <Input {...field} className="h-8" autoFocus />
                      </div>
                    )}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portrait</FormLabel>
                <FormControl>
                  <Crop
                    field={field}
                    croppedImageFile={croppedImageFile}
                    setCroppedImageFile={setCroppedImageFile}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {userId ? (
            <FormField
              control={form.control}
              name="sendToDb"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Register this passport?</FormLabel>
                  <FormDescription>
                    Checking this box will register you for the next passport
                    ceremony. You can make as many changes as you want before
                    the ceremony.
                  </FormDescription>
                  <FormControl>
                    <Checkbox
                      className="h-6 w-6"
                      onCheckedChange={(e) => {
                        // it hasn't updated the value at this point yet, so it's the opposite actually
                        if (field.value === true) {
                          setGenerationSteps(GENERATION_STEPS.base);
                        } else {
                          setGenerationSteps(GENERATION_STEPS.register);
                        }
                        return field.onChange(e);
                      }}
                      checked={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <Button className="amberButton" type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </form>
      </Form>
      <aside>
        <div className="flex flex-col gap-4">
          <img
            ref={generatedImageRef}
            src={generatedImageUrl}
            alt="Preview of passport page"
            className="shadow-lg rounded-lg w-full bg-slate-100"
          />
          {isLoading ? (
            <ul>
              {generationSteps.map((step, index) => (
                <div key={index} className="flex flex-row items-center gap-1">
                  <li
                    className={`${
                      step.status === "completed"
                        ? "text-success"
                        : step.status === "failed"
                        ? "text-destructive"
                        : "text-gray-400"
                    }`}
                  >
                    {step.name}...
                  </li>
                  {step.status === "completed" ? (
                    <CheckCircle color="var(--success)" width={16} />
                  ) : null}
                </div>
              ))}
            </ul>
          ) : null}
          {!isDefaultImage && !isLoading && (
            <a href={generatedImageUrl} download={generateDownloadName()}>
              <Button className="w-full amberButton" type="button">
                Download
              </Button>
            </a>
          )}
        </div>
      </aside>
    </main>
  );
}
