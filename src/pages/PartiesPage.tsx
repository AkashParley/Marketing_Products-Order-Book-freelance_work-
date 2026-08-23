import { useState } from "react";
import { Plus, Pencil, Trash2, Users, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useParties } from "@/hooks/useParties";
import { store } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import type { Party } from "@/types";

export default function PartiesPage() {
  const { parties, loading, refetch } = useParties();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Party | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await store.deleteParty(deleteTarget.id);
      toast("Party deleted");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast("Could not delete party", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Parties</h1>
          <p className="text-sm text-ink-soft">Order parties and loading contacts.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add Party
        </Button>
      </div>

      {loading ? (
        <PartiesSkeleton />
      ) : parties.length === 0 ? (
        <EmptyState onAdd={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parties.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-2.5 p-5">
                <div className="flex items-start justify-between">
                  <div className="font-display text-base font-semibold text-ink">{p.name}</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {p.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <Phone className="h-3.5 w-3.5" /> {p.phone}
                  </div>
                )}
                {(p.city || p.address) && (
                  <div className="flex items-start gap-1.5 text-sm text-ink-soft">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{[p.address, p.city].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {p.notes && <div className="text-xs text-ink-soft/80 italic">{p.notes}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PartyDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          refetch();
        }}
      />
      <PartyDialog
        party={editing ?? undefined}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the party from your list. Existing orders keep their saved party
              details and are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PartyDialog({
  party,
  open,
  onOpenChange,
  onSaved,
}: {
  party?: Party;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(party?.name ?? "");
  const [phone, setPhone] = useState(party?.phone ?? "");
  const [address, setAddress] = useState(party?.address ?? "");
  const [city, setCity] = useState(party?.city ?? "");
  const [notes, setNotes] = useState(party?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast("Enter a party name", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        notes: notes.trim() || null,
      };
      if (party) {
        await store.updateParty(party.id, payload);
        toast("Party updated");
      } else {
        await store.createParty(payload);
        toast("Party added");
      }
      onSaved();
    } catch {
      toast("Could not save party", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setName(party?.name ?? "");
          setPhone(party?.phone ?? "");
          setAddress(party?.address ?? "");
          setCity(party?.city ?? "");
          setNotes(party?.notes ?? "");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{party ? "Edit party" : "Add party"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="party-name">Party name</Label>
            <Input id="party-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Geeta Ram & Sons" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="party-phone">Phone</Label>
            <Input id="party-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8394987423" inputMode="tel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="party-city">City</Label>
              <Input id="party-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Gangoh (Saharanpur)" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="party-address">Address</Label>
              <Input id="party-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="party-notes">Notes</Label>
            <Textarea id="party-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <div className="font-display text-base font-semibold text-ink">No parties yet</div>
          <div className="text-sm text-ink-soft">Add a party to start creating orders.</div>
        </div>
        <Button onClick={onAdd}>
          <Plus /> Add Party
        </Button>
      </CardContent>
    </Card>
  );
}

function PartiesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-paper-dim" />
      ))}
    </div>
  );
}
