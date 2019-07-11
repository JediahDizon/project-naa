import { Color } from "app/constants";
import { I18n } from "app/services";

export default {
	styles: {
		tag: {
			padding: 1,
			margin: 0,
			borderRadius: 10,
			backgroundColor: Color["BLUE"]
		},
		headerImage: {
			width: 50,
			height: 50, // On iOS, this height extends and covers the view body of the router
			alignSelf: "center"
		}
	},
	translations: (params) => ({
		"projects": I18n.t("pages.dashboard.projects", { defaultValue: "Projects", ...params }),
		"tasks": I18n.t("pages.dashboard.tasks", { defaultValue: "Tasks", ...params }),

		// CUSTOM TRANSLATIONS
		"unlinkedTasks": I18n.t("", { defaultValue: "Unlinked Tasks", ...params }),
		"addUnlinkedTasks": I18n.t("", { defaultValue: "Add Unlinked Tasks", ...params }),
		"user": I18n.t("", { defaultValue: "User", ...params }),
		"form": I18n.t("", { defaultValue: "Form", ...params }),
		"sync": I18n.t("", { defaultValue: "Sync", ...params }),
		"gallery": I18n.t("", { defaultValue: "Gallery", ...params }),
		"camera": I18n.t("", { defaultValue: "Camera", ...params }),
		"images": I18n.t("", { defaultValue: "Images", ...params }),
		"misc": I18n.t("", { defaultValue: "Misc", ...params })
	})
};
