import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { ApprovalFormField } from "@/lib/constants";

type ChainStep = { order: number; roleName: string; action: string };

type ApprovalTypeRow = {
  id: string;
  name: string;
  description: string | null;
  fields: ApprovalFormField[];
};

type ChainRow = {
  id: string;
  name: string;
  approval_type_id: string | null;
  steps: ChainStep[];
};

export default function NewRequest() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedType, setSelectedType] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [types, setTypes] = useState<ApprovalTypeRow[]>([]);
  const [chainsByType, setChainsByType] = useState<Record<string, ChainRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [rawTypes, chains] = await Promise.all([
          api.approvalTypes.list() as Promise<any[]>,
          api.approvalChains.list() as Promise<any[]>,
        ]);

      if (cancelled) return;

      setTypes(
        rawTypes.map((t) => ({
          ...t,
          fields: Array.isArray(t.fields) ? t.fields : [],
        })),
      );

      const map: Record<string, ChainRow[]> = {};
      for (const c of chains as any[]) {
        const tid = c.approval_type_id;
        if (!tid) continue;
        if (!map[tid]) map[tid] = [];
        map[tid].push({
          id: c.id,
          name: c.name,
          approval_type_id: c.approval_type_id,
          steps: Array.isArray(c.steps) ? c.steps : [],
        });
      }
      setChainsByType(map);
      } catch {
        if (!cancelled) {
          setTypes([]);
          setChainsByType({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const approvalType = types.find((t) => t.id === selectedType);
  const chainList = selectedType ? chainsByType[selectedType] ?? [] : [];
  const chain = chainList[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !chain) {
      toast.error("Select a request type with a configured approval chain.");
      return;
    }
    if (!editorContent || editorContent === "<p></p>") {
      toast.error("Please fill in the request content.");
      return;
    }

    setSubmitting(true);
    if (!user) {
      toast.error("You must be signed in.");
      setSubmitting(false);
      return;
    }

    const steps = chain.steps ?? [];
    const totalSteps = steps.length;

    try {
      await api.approvalRequests.create({
        approval_type_id: selectedType,
        approval_chain_id: chain.id,
        department_id: profile?.department_id ?? null,
        form_data: { content: editorContent } as Record<string, unknown>,
        current_step: 1,
        total_steps: Math.max(totalSteps, 1),
        status: totalSteps > 0 ? "in_progress" : "pending",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
      setSubmitting(false);
      return;
    }

    toast.success("Request submitted");
    navigate("/approvals");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/approvals")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-xl font-bold text-foreground">New Approval Request</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Request Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v);
                setEditorContent("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an approval type..." />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} - {type.description ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {types.length === 0 && <p className="text-sm text-muted-foreground mt-2">No approval types configured yet.</p>}
          </CardContent>
        </Card>

        {approvalType && (
          <>
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Request Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {approvalType.description && (
                  <div className="bg-muted/50 border rounded-md p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Instructions</p>
                    <p className="text-sm text-foreground">{approvalType.description}</p>
                  </div>
                )}
                {approvalType.fields.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">Required Information</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-foreground">
                      {approvalType.fields.map((field) => (
                        <li key={field.name}>
                          <span className="font-medium">{field.label}</span>
                          {field.required && <span className="text-destructive ml-1">*</span>}
                          {field.type === "select" && field.options?.length ? (
                            <span className="text-muted-foreground ml-1">(Options: {field.options.join(", ")})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <RichTextEditor
                  content={editorContent}
                  onChange={setEditorContent}
                  placeholder="Compose your request here..."
                />
              </CardContent>
            </Card>

            {chain ? (
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Approval Chain: {chain.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {chain.steps.map((step) => (
                      <div key={step.order} className="flex items-center gap-3 text-sm">
                        <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {step.order}
                        </div>
                        <div>
                          <span className="font-medium">{step.roleName}</span>
                          <span className="text-muted-foreground ml-2">— {step.action}</span>
                        </div>
                      </div>
                    ))}
                    {chain.steps.length === 0 && <p className="text-sm text-muted-foreground">This chain has no steps yet.</p>}
                  </div>
                </CardContent>
              </Card>
            ) : (
              selectedType && (
                <p className="text-sm text-destructive">
                  No approval chain is configured for this type. Ask an administrator to create one in Admin → Chains.
                </p>
              )
            )}

            <Button type="submit" className="gap-2" disabled={submitting || !chain}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
