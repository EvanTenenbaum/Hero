import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HardDrive,
  Folder,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  File,
  ChevronRight,
  ArrowLeft,
  Search,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface DrivePaneProps {
  onFileSelect?: (file: DriveFile) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export default function DrivePane({ onFileSelect }: DrivePaneProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const connectionQuery = trpc.drive.getConnection.useQuery();
  const authUrlQuery = trpc.drive.getAuthUrl.useQuery(undefined, {
    enabled: !connectionQuery.data && !connectionQuery.isLoading,
  });
  
  const filesQuery = trpc.drive.listFiles.useQuery(
    { folderId: currentFolderId, query: searchQuery || undefined },
    { enabled: !!connectionQuery.data }
  );

  const disconnectMutation = trpc.drive.disconnect.useMutation({
    onSuccess: () => {
      connectionQuery.refetch();
      toast.success("Disconnected from Google Drive");
    },
  });

  const handleConnect = () => {
    if (authUrlQuery.data) {
      window.open(authUrlQuery.data, "_blank", "width=600,height=700");
    }
  };

  const handleFolderClick = (folder: DriveFile) => {
    setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleBack = () => {
    if (folderStack.length > 0) {
      const newStack = [...folderStack];
      newStack.pop();
      setFolderStack(newStack);
      setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : undefined);
    }
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      handleFolderClick(file);
    } else {
      onFileSelect?.(file);
      if (file.webViewLink) {
        window.open(file.webViewLink, "_blank");
      }
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <Folder className="w-4 h-4 text-yellow-500" />;
    }
    if (mimeType.startsWith("image/") || mimeType === "application/vnd.google-apps.drawing") {
      return <Image className="w-4 h-4 text-green-500" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType === "application/vnd.google-apps.spreadsheet") {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (mimeType.includes("presentation") || mimeType === "application/vnd.google-apps.presentation") {
      return <Presentation className="w-4 h-4 text-orange-500" />;
    }
    if (mimeType.includes("document") || mimeType === "application/vnd.google-apps.document" || mimeType.startsWith("text/")) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  // Not connected state
  if (!connectionQuery.data && !connectionQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <HardDrive className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Connect Google Drive</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          Access your design files, documents, and assets directly in Hero IDE
        </p>
        <Button onClick={handleConnect} disabled={!authUrlQuery.data}>
          {authUrlQuery.isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <HardDrive className="w-4 h-4 mr-2" />
          )}
          Connect Google Drive
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Requires Google OAuth credentials to be configured
        </p>
      </div>
    );
  }

  // Loading state
  if (connectionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Google Drive</span>
          <span className="text-xs text-muted-foreground">
            ({connectionQuery.data?.email})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => filesQuery.refetch()}
            disabled={filesQuery.isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${filesQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => disconnectMutation.mutate()}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Search and navigation */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        {folderStack.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1 min-w-0">
          <span className="shrink-0">My Drive</span>
          {folderStack.map((folder, idx) => (
            <span key={folder.id} className="flex items-center">
              <ChevronRight className="w-3 h-3 mx-1" />
              <span className="truncate">{folder.name}</span>
            </span>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-32 pl-7 text-xs"
          />
        </div>
      </div>

      {/* File list */}
      <ScrollArea className="flex-1">
        {filesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filesQuery.data?.files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No files found" : "This folder is empty"}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filesQuery.data?.files.map((file) => (
              <button
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left group"
              >
                {getFileIcon(file.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.modifiedTime && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {file.mimeType === "application/vnd.google-apps.folder" ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                ) : file.webViewLink ? (
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
