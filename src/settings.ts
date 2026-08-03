"use strict";

import powerbi from "powerbi-visuals-api";
import {
    formattingSettings
} from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard =
    formattingSettings.SimpleCard;

import FormattingSettingsSlice =
    formattingSettings.Slice;

import FormattingSettingsModel =
    formattingSettings.Model;

class SelectionCardSettings extends FormattingSettingsCard {
    public mode =
        new formattingSettings.AutoDropdown({
            name: "mode",
            displayName: "Selection mode",
            description:
                "Choose whether the visual allows one selected branch or multiple selected branches.",
            value: "Single"
        });

    public showIncludedCounts =
        new formattingSettings.ToggleSwitch({
            name: "showIncludedCounts",
            displayName: "Show included counts",
            description:
                "Show or hide the number of values included through higher-level selections.",
            value: true
        });

    public name: string = "selection";
    public displayName: string = "Selection";

    public slices: FormattingSettingsSlice[] = [
        this.mode,
        this.showIncludedCounts
    ];
}

class ValuesCardSettings extends FormattingSettingsCard {
    public fontFamily =
        new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Value font",
            description:
                "Choose the font family used for field value buttons.",
            value: "Arial, sans-serif"
        });

    public fontSize =
        new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Value text size",
            description:
                "Set the text size used for field values, from 8 to 28 pixels.",
            value: 12,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 8
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 28
                }
            }
        });

    public buttonHeight =
        new formattingSettings.NumUpDown({
            name: "buttonHeight",
            displayName: "Value height",
            description:
                "Set the minimum height of each hierarchy value button, from 20 to 80 pixels.",
            value: 32,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 20
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 80
                }
            }
        });

    public buttonRadius =
        new formattingSettings.NumUpDown({
            name: "buttonRadius",
            displayName: "Value corner radius",
            description:
                "Round the corners of field value buttons. Use 0 for square corners.",
            value: 4,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 24
                }
            }
        });

    public buttonGap =
        new formattingSettings.NumUpDown({
            name: "buttonGap",
            displayName: "Gap between values",
            description:
                "Set the vertical spacing between field value buttons.",
            value: 2,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 24
                }
            }
        });

    public name: string = "values";
    public displayName: string = "Values";

    public slices: FormattingSettingsSlice[] = [
        this.fontFamily,
        this.fontSize,
        this.buttonHeight,
        this.buttonRadius,
        this.buttonGap
    ];
}

class ColoursCardSettings extends FormattingSettingsCard {
    public valueText =
        new formattingSettings.ColorPicker({
            name: "valueText",
            displayName: "Value text",
            description:
                "Set the text colour used by normal field values.",
            value: {
                value: "#242424"
            }
        });

    public hoverBackground =
        new formattingSettings.ColorPicker({
            name: "hoverBackground",
            displayName: "Hover background",
            description:
                "Set the background colour shown when the pointer is over a hierarchy value.",
            value: {
                value: "#F0F0F0"
            }
        });

    public selectedText =
        new formattingSettings.ColorPicker({
            name: "selectedText",
            displayName: "Selected text",
            description:
                "Set the text colour used by selected field values.",
            value: {
                value: "#242424"
            }
        });

    public selectedBackground =
        new formattingSettings.ColorPicker({
            name: "selectedBackground",
            displayName: "Selected background",
            description:
                "Set the background colour used to highlight selected field values.",
            value: {
                value: "#E1DFDD"
            }
        });

    public alternativeText =
        new formattingSettings.ColorPicker({
            name: "alternativeText",
            displayName: "Alternative text",
            description:
                "Set the text colour of values outside the currently active selection path.",
            value: {
                value: "#6B6B6B"
            }
        });

    public alternativeOpacity =
        new formattingSettings.NumUpDown({
            name: "alternativeOpacity",
            displayName: "Alternative opacity",
            description:
                "Set how strongly values outside the active selection path are muted, from 10% to 100%.",
            value: 65,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 10
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 100
                }
            }
        });

    public borderColour =
        new formattingSettings.ColorPicker({
            name: "borderColour",
            displayName: "Borders and dividers",
            description:
                "Set the colour used for level borders, selected-value borders and alternative-value dividers.",
            value: {
                value: "#D1D1D1"
            }
        });

    public name: string = "colours";
    public displayName: string = "Colours";

    public slices: FormattingSettingsSlice[] = [
        this.valueText,
        this.hoverBackground,
        this.selectedText,
        this.selectedBackground,
        this.alternativeText,
        this.alternativeOpacity,
        this.borderColour
    ];
}

class HeadingsCardSettings extends FormattingSettingsCard {
    public fontFamily =
        new formattingSettings.FontPicker({
            name: "fontFamily",
            displayName: "Heading font",
            description:
                "Choose the font family used for field headings.",
            value: "Arial, sans-serif"
        });

    public fontSize =
        new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Heading text size",
            description:
                "Set the text size used for field headings, from 8 to 28 pixels.",
            value: 12,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 8
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 28
                }
            }
        });

    public bold =
        new formattingSettings.ToggleSwitch({
            name: "bold",
            displayName: "Bold headings",
            description:
                "Use a bold font weight for field headings.",
            value: true
        });

    public textColour =
        new formattingSettings.ColorPicker({
            name: "textColour",
            displayName: "Heading text",
            description:
                "Set the text colour used by field headings.",
            value: {
                value: "#242424"
            }
        });

    public name: string = "headings";
    public displayName: string = "Headings";

    public slices: FormattingSettingsSlice[] = [
        this.fontFamily,
        this.fontSize,
        this.bold,
        this.textColour
    ];
}

class LevelContainersCardSettings
    extends FormattingSettingsCard {
    public showBackground =
        new formattingSettings.ToggleSwitch({
            name: "showBackground",
            displayName: "Show background",
            description:
                "Show a background colour behind each field's value list.",
            value: false
        });

    public backgroundColour =
        new formattingSettings.ColorPicker({
            name: "backgroundColour",
            displayName: "Background",
            description:
                "Set the background colour used behind each field's value list.",
            value: {
                value: "#FFFFFF"
            }
        });

    public borderWidth =
        new formattingSettings.NumUpDown({
            name: "borderWidth",
            displayName: "Border width",
            description:
                "Set the width of the border around each field's value list. Use 0 to hide the border.",
            value: 1,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 8
                }
            }
        });

    public cornerRadius =
        new formattingSettings.NumUpDown({
            name: "cornerRadius",
            displayName: "Corner radius",
            description:
                "Round the corners of each field container. Use 0 for square corners.",
            value: 4,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 24
                }
            }
        });

    public innerPadding =
        new formattingSettings.NumUpDown({
            name: "innerPadding",
            displayName: "Inner padding",
            description:
                "Set the space between a field container's border and its field values.",
            value: 2,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 20
                }
            }
        });

    public name: string = "levelContainers";
    public displayName: string = "Field containers";

    public slices: FormattingSettingsSlice[] = [
        this.showBackground,
        this.backgroundColour,
        this.borderWidth,
        this.cornerRadius,
        this.innerPadding
    ];
}

class ClearControlsCardSettings
    extends FormattingSettingsCard {
    public textColour =
        new formattingSettings.ColorPicker({
            name: "textColour",
            displayName: "Text and icon",
            description:
                "Set the colour used by the Clear all text and the per-field clear icons.",
            value: {
                value: "#242424"
            }
        });

    public hoverBackground =
        new formattingSettings.ColorPicker({
            name: "hoverBackground",
            displayName: "Hover background",
            description:
                "Set the background colour shown when the pointer is over a clear control.",
            value: {
                value: "#F0F0F0"
            }
        });

    public clearAllFontSize =
        new formattingSettings.NumUpDown({
            name: "clearAllFontSize",
            displayName: "Clear all text size",
            description:
                "Set the text size used by the Clear all control, from 8 to 20 pixels.",
            value: 12,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 8
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 20
                }
            }
        });

    public levelIconSize =
        new formattingSettings.NumUpDown({
            name: "levelIconSize",
            displayName: "Field clear icon size",
            description:
                "Set the size of the clear icon shown beside a selected field.",
            value: 18,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 10
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 28
                }
            }
        });

    public name: string = "clearControls";
    public displayName: string = "Clear controls";

    public slices: FormattingSettingsSlice[] = [
        this.textColour,
        this.hoverBackground,
        this.clearAllFontSize,
        this.levelIconSize
    ];
}

class LayoutCardSettings extends FormattingSettingsCard {
    public visualPadding =
        new formattingSettings.NumUpDown({
            name: "visualPadding",
            displayName: "Visual padding",
            description:
                "Set the space between the edge of the visual and its selector content.",
            value: 6,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        });

    public levelGap =
        new formattingSettings.NumUpDown({
            name: "levelGap",
            displayName: "Gap between fields",
            description:
                "Set the horizontal spacing between field columns.",
            value: 8,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 0
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 40
                }
            }
        });

    public minimumLevelWidth =
        new formattingSettings.NumUpDown({
            name: "minimumLevelWidth",
            displayName: "Minimum field width",
            description:
                "Set the minimum width of each field. Wider fields may introduce horizontal scrolling.",
            value: 160,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 80
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 400
                }
            }
        });

    public minimumValuesForSearch =
        new formattingSettings.NumUpDown({
            name: "minimumValuesForSearch",
            displayName: "Minimum values for search",
            description:
                "Show search only when a field contains at least this many distinct values.",
            value: 1,
            options: {
                minValue: {
                    type:
                        powerbi.visuals.ValidatorType.Min,
                    value: 1
                },
                maxValue: {
                    type:
                        powerbi.visuals.ValidatorType.Max,
                    value: 10000
                }
            }
        });

    public showSearchBoxes =
        new formattingSettings.ToggleSwitch({
            name: "showSearchBoxes",
            displayName: "Show search boxes",
            description:
                "Show or hide the search box in every field.",
            value: true
        });

    public showClearAll =
        new formattingSettings.ToggleSwitch({
            name: "showClearAll",
            displayName: "Show Clear all",
            description:
                "Show or hide Clear all alongside the field headings.",
            value: true
        });

    public name: string = "layout";
    public displayName: string = "Layout";

    public slices: FormattingSettingsSlice[] = [
        this.visualPadding,
        this.levelGap,
        this.minimumLevelWidth,
        this.showSearchBoxes,
        this.minimumValuesForSearch,
        this.showClearAll
    ];
}

export class VisualFormattingSettingsModel
    extends FormattingSettingsModel {
    public selectionCard =
        new SelectionCardSettings();

    public valuesCard =
        new ValuesCardSettings();

    public coloursCard =
        new ColoursCardSettings();

    public headingsCard =
        new HeadingsCardSettings();

    public levelContainersCard =
        new LevelContainersCardSettings();

    public clearControlsCard =
        new ClearControlsCardSettings();

    public layoutCard =
        new LayoutCardSettings();

    public cards = [
        this.selectionCard,
        this.valuesCard,
        this.coloursCard,
        this.headingsCard,
        this.levelContainersCard,
        this.clearControlsCard,
        this.layoutCard
    ];
}
