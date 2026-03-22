import { useNavigate } from "react-router-dom";

import SidebarLayout from "../../Components/Layout/SidebarLayout";
import OrganisationPanel from "../../Components/OrganisationTool/OrganisationPanel";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

export default function OrganizationToolPage() {
  const navigate = useNavigate();

  const handleSelectTag = (tag: PrimaryTag) => {
    localStorage.setItem("selectedTag", JSON.stringify(tag));
    navigate(`/modules/${tag.id}`);
  };

  return (
    <SidebarLayout
      selectedTagId={null}
      onSelectTag={handleSelectTag}
      onTagsChanged={() => {}}
      refreshKey={0}
      contentMaxWidth="none"
    >
      <OrganisationPanel />
    </SidebarLayout>
  );
}
