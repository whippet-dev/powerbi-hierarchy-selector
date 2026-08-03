"use strict";

import {
    formattingSettings
} from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard =
formattingSettings.SimpleCard;

import FormattingSettingsSlice =
formattingSettings.Slice;

import FormattingSettingsModel =
formattingSettings.Model;

import powerbi from "powerbi-visuals-api";

class ValuesCardSettings extends FormattingSettingsCard {
public fontSize =
    new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Value text size",
        description:
            "Sets the text size used by hierarchy value buttons.",
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
                "Sets the minimum height of hierarchy value buttons.",
            value: 32
        });

    public buttonRadius =
        new formattingSettings.NumUpDown({
            name: "buttonRadius",
            displayName: "Value corner radius",
            description:
                "Sets the corner radius used by hierarchy value buttons.",
            value: 4
        });

    public buttonGap =
        new formattingSettings.NumUpDown({
            name: "buttonGap",
            displayName: "Gap between values",
            description:
                "Sets the vertical gap between hierarchy value buttons.",
            value: 4
        });

    public name: string = "values";
    public displayName: string = "Values";

    public slices: FormattingSettingsSlice[] = [
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
            value: {
                value: "#242424"
            }
        });

    public hoverBackground =
        new formattingSettings.ColorPicker({
            name: "hoverBackground",
            displayName: "Hover background",
            value: {
                value: "#F0F0F0"
            }
        });

    public selectedText =
        new formattingSettings.ColorPicker({
            name: "selectedText",
            displayName: "Selected text",
            value: {
                value: "#242424"
            }
        });

    public selectedBackground =
        new formattingSettings.ColorPicker({
            name: "selectedBackground",
            displayName: "Selected background",
            value: {
                value: "#E1DFDD"
            }
        });

    public alternativeText =
        new formattingSettings.ColorPicker({
            name: "alternativeText",
            displayName: "Alternative text",
            description:
                "Sets the text colour of values outside the active hierarchy branch.",
            value: {
                value: "#6B6B6B"
            }
        });

    public borderColour =
        new formattingSettings.ColorPicker({
            name: "borderColour",
            displayName: "Borders and dividers",
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
        this.borderColour
    ];
}

class HeadingsCardSettings extends FormattingSettingsCard {
public fontSize =
    new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Heading text size",
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

    public textColour =
        new formattingSettings.ColorPicker({
            name: "textColour",
            displayName: "Heading text",
            value: {
                value: "#242424"
            }
        });

    public name: string = "headings";
    public displayName: string = "Headings";

    public slices: FormattingSettingsSlice[] = [
        this.fontSize,
        this.textColour
    ];
}

class LayoutCardSettings extends FormattingSettingsCard {
    public visualPadding =
        new formattingSettings.NumUpDown({
            name: "visualPadding",
            displayName: "Visual padding",
            value: 12
        });

    public levelGap =
        new formattingSettings.NumUpDown({
            name: "levelGap",
            displayName: "Gap between levels",
            value: 12
        });

    public showClearAll =
        new formattingSettings.ToggleSwitch({
            name: "showClearAll",
            displayName: "Show Clear all",
            value: true
        });

    public name: string = "layout";
    public displayName: string = "Layout";

    public slices: FormattingSettingsSlice[] = [
        this.visualPadding,
        this.levelGap,
        this.showClearAll
    ];
}

export class VisualFormattingSettingsModel
    extends FormattingSettingsModel {
    public valuesCard =
        new ValuesCardSettings();

    public coloursCard =
        new ColoursCardSettings();

    public headingsCard =
        new HeadingsCardSettings();

    public layoutCard =
        new LayoutCardSettings();

    public cards = [
        this.valuesCard,
        this.coloursCard,
        this.headingsCard,
        this.layoutCard
    ];
}
