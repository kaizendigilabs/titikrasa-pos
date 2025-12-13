"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { IconX, IconLoader2, IconBuildingStore } from "@tabler/icons-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoreProfileSettings } from "@/features/settings/types";
import { useUpdateSettingsMutation } from "@/features/settings/hooks";
import { uploadStoreImage } from "@/lib/utils/upload-helpers";
import { cn } from "@/lib/utils";

type StoreProfileFormProps = {
  storeProfile: StoreProfileSettings;
};

type FormValues = {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  footerNote: string;
};

const toDefaults = (profile: StoreProfileSettings): FormValues => ({
  name: profile.name,
  address: profile.address,
  phone: profile.phone,
  logoUrl: profile.logoUrl ?? "",
  footerNote: profile.footerNote ?? "",
});

function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md hover:shadow-stone-200/50 dark:hover:shadow-none",
        className,
      )}
    >
      <div className="border-b border-border/40 pb-4 mb-6">
         <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
          <span className="inline-block h-1 w-1 rounded-full bg-primary/40" />
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function StoreProfileForm({ storeProfile }: StoreProfileFormProps) {
  const mutation = useUpdateSettingsMutation();
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const form = useForm({
    defaultValues: toDefaults(storeProfile),
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        storeProfile: {
          name: value.name.trim(),
          address: value.address.trim(),
          phone: value.phone.trim(),
          logoUrl: value.logoUrl.trim().length > 0 ? value.logoUrl.trim() : null,
          footerNote: value.footerNote.trim().length > 0 ? value.footerNote.trim() : null,
        },
      });
      toast.success("Profil gerai berhasil diperbarui");
    },
  });

  React.useEffect(() => {
    form.reset(toDefaults(storeProfile));
  }, [storeProfile, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processUpload(file);
  };

  const processUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const result = await uploadStoreImage(file);
      form.setFieldValue("logoUrl", result.url);
      toast.success("Logo berhasil diupload");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processUpload(file);
  };

  const handleRemoveLogo = () => {
    form.setFieldValue("logoUrl", "");
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Identitas Section */}
        <FormSection title="Identitas Utama">
          <div className="space-y-4">
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">
                    Nama Toko
                  </Label>
                  <Input
                    className="h-11 border-border/60 bg-muted/20 font-medium transition-colors hover:border-primary/30 focus:border-primary/50 focus:bg-background"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Contoh: Titikrasa Coffee"
                    required
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="phone">
              {(field) => (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">
                    Kontak / Telepon
                  </Label>
                  <Input
                    className="h-11 border-border/60 bg-muted/20 transition-colors hover:border-primary/30 focus:border-primary/50 focus:bg-background"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="+62 8..."
                    required
                  />
                </div>
              )}
            </form.Field>

             <form.Field name="address">
              {(field) => (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">
                    Alamat Lengkap
                  </Label>
                  <Textarea
                    className="min-h-[120px] resize-none border-border/60 bg-muted/20 transition-colors hover:border-primary/30 focus:border-primary/50 focus:bg-background"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Alamat lengkap toko..."
                    required
                  />
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>

        {/* Branding Section */}
        <div className="space-y-6">
           <FormSection title="Logo Toko">
             <form.Field name="logoUrl">
              {(field) => (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-muted/10 p-8 transition-colors hover:bg-muted/30",
                      isDragging && "border-primary/50 bg-primary/5",
                      field.state.value ? "py-6" : "py-12"
                    )}
                  >
                    {field.state.value ? (
                      <div className="relative group/image">
                        <div className="relative h-32 w-32 overflow-hidden rounded-xl border bg-white shadow-sm p-2">
                          <Image
                            src={field.state.value}
                            alt="Logo preview"
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-white shadow-md transition-transform hover:scale-110 opacity-0 group-hover/image:opacity-100"
                        >
                          <IconX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                           <IconBuildingStore className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            Upload Logo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Drag & drop atau klik untuk pilih file
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />

                    {!field.state.value && (
                       <Button
                        type="button"
                        variant="ghost" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="mt-4 h-9 px-4 text-xs font-medium"
                      >
                         {isUploading ? (
                          <>
                            <IconLoader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : "Pilih File"}
                      </Button>
                    )}

                    {field.state.value && (
                      <Button
                        type="button"
                        variant="ghost"
                         size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                         Ganti Logo
                      </Button>
                    )}
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground/60">
                    Format: JPG, PNG, WebP. Maksimal 2MB.
                  </p>
                </div>
              )}
            </form.Field>
           </FormSection>

           <FormSection title="Footer Struk">
             <form.Field name="footerNote">
              {(field) => (
                <div className="space-y-2">
                   <Label className="text-xs font-medium text-muted-foreground uppercase">
                    Catatan Bawah
                  </Label>
                  <Textarea
                    className="min-h-[100px] resize-none border-border/60 bg-muted/20 font-mono text-sm transition-colors hover:border-primary/30 focus:border-primary/50 focus:bg-background"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Contoh: Terima kasih telah berbelanja..."
                  />
                </div>
              )}
            </form.Field>
           </FormSection>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          size="lg"
          className="min-w-[120px] rounded-xl font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
          disabled={mutation.isPending || form.state.isSubmitting || !form.state.isDirty || isUploading}
        >
          {mutation.isPending || form.state.isSubmitting ? (
             <>
               <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> 
               Menyimpan...
             </>
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
      </div>
    </form>
  );
}


