export type SourceSyncState = "synced" | "desynced";

export interface SourceBundle {
  readonly cSource?: string;
  readonly riscVSource: string;
  readonly syncState: SourceSyncState;
}

export class SourceSyncPolicy {
  markDesynced(sourceBundle: SourceBundle): SourceBundle {
    return { ...sourceBundle, syncState: "desynced" };
  }

  canEditC(sourceBundle: SourceBundle): boolean {
    return sourceBundle.syncState === "synced";
  }

  removeNonPersistableC(sourceBundle: SourceBundle): SourceBundle {
    if (sourceBundle.syncState === "synced") {
      return sourceBundle;
    }

    return {
      riscVSource: sourceBundle.riscVSource,
      syncState: sourceBundle.syncState
    };
  }
}
