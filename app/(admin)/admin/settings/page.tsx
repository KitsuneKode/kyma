import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  IconBuildingSkyscraper,
  IconUpload,
  IconKey,
  IconRobotFace,
} from '@tabler/icons-react'

export default function SettingsPage() {
  return (
    <div className="flex w-full flex-col gap-10">
      <PageHeader
        eyebrow="Configuration"
        title="Workspace Settings"
        description="Manage your organization profile, AI personas, and external API integrations."
      />

      <div className="grid max-w-4xl gap-8">
        {/* Organization Profile */}
        <section className="rounded-3xl bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconBuildingSkyscraper className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Organization Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                This info appears on candidate invites.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-2">
              <Label
                htmlFor="companyName"
                className="font-semibold text-foreground/80"
              >
                Company Name
              </Label>
              <Input
                id="companyName"
                defaultValue="Acme Corp"
                className="h-12 rounded-xl bg-muted/20"
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold text-foreground/80">
                Company Logo
              </Label>
              <div className="flex items-center gap-6 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 transition-colors hover:bg-muted/20">
                <div className="flex size-16 items-center justify-center rounded-xl bg-muted/30 ring-1 ring-border">
                  <IconBuildingSkyscraper className="size-8 text-muted-foreground/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Square image, PNG or JPG up to 2MB.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2 rounded-lg"
                    nativeButton={false}
                  >
                    <IconUpload className="size-4" />
                    Upload new logo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Persona */}
        <section className="rounded-3xl bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconRobotFace className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Interviewer Persona
              </h2>
              <p className="text-sm text-muted-foreground">
                Customize how the AI introduces itself.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-2">
              <Label
                htmlFor="personaName"
                className="font-semibold text-foreground/80"
              >
                Interviewer Name
              </Label>
              <Input
                id="personaName"
                defaultValue="Kyma"
                className="h-12 rounded-xl bg-muted/20"
              />
              <p className="text-xs text-muted-foreground">
                The name used during voice introductions.
              </p>
            </div>
          </div>
        </section>

        {/* BYOK (Keys) */}
        <section className="rounded-3xl bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconKey className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                API Keys (BYOK)
              </h2>
              <p className="text-sm text-muted-foreground">
                Bring your own keys for language models and STT.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-2">
              <Label
                htmlFor="openaiKey"
                className="font-semibold text-foreground/80"
              >
                OpenAI API Key
              </Label>
              <Input
                id="openaiKey"
                type="password"
                placeholder="sk-..."
                className="h-12 rounded-xl bg-muted/20"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="livekitKey"
                className="font-semibold text-foreground/80"
              >
                LiveKit Secret
              </Label>
              <Input
                id="livekitKey"
                type="password"
                placeholder="devkey_..."
                className="h-12 rounded-xl bg-muted/20"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4 pb-12">
          <Button
            className="rounded-full px-8 py-6 text-sm font-semibold shadow-xl transition-all active:scale-[0.96]"
            nativeButton={false}
          >
            Save all settings
          </Button>
        </div>
      </div>
    </div>
  )
}
