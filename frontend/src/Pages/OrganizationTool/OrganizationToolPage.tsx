import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SidebarLayout from "../../Components/Layout/SidebarLayout";
import OrganisationPanel from "../../Components/OrganisationTool/OrganisationPanel";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

export default function OrganizationToolPage() {
  const navigate = useNavigate();
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("selectedTag");
    if (!saved) {
      return;
    }

    try {
      const parsed: PrimaryTag = JSON.parse(saved);
      setSelectedTagId(parsed.id);
    } catch {
      localStorage.removeItem("selectedTag");
    }
  }, []);

  const handleSelectTag = (tag: PrimaryTag) => {
    localStorage.setItem("selectedTag", JSON.stringify(tag));
    navigate(`/modules/${tag.id}`);
  };

  return (
    <SidebarLayout
      selectedTagId={selectedTagId}
      onSelectTag={handleSelectTag}
      onTagsChanged={() => {}}
      refreshKey={0}
      contentMaxWidth="none"
      menuPlacement="inline"
    >
      <OrganisationPanel />
    </SidebarLayout>
  );
}
