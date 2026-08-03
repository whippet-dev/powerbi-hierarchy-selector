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

class ValuesCardSettings extends FormattingSettingsCard {
    public fontSize =
        new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Value text size",
            description:
                "Sets the text size used by hierarchy value buttons.",
            value: 12
        });

    public buttonRadius =
        new formattingSettings.NumUpDown({
            name: "buttonRadius",
            displayName: "Value corner radius",
            description:
                "Sets the corner radius used by hierarchy value buttons.",
            value: 4
        });

    public name: string = "values";
    public displayName: string = "Values";

    public slices: FormattingSettingsSlice[] = [
        this.fontSize,
        this.buttonRadius
    ];
}

class ColoursCardSettings extends FormattingSettingsCard {
    public selectedBackground =
        new formattingSettings.ColorPicker({
            name: "selectedBackground",
            displayName: "Selected background",
            description:
                "Sets the background colour used by selected hierarchy values.",
            value: {
                value: "#E1DFDD"
            }
        });

    public name: string = "colours";
    public displayName: string = "Colours";

    public slices: FormattingSettingsSlice[] = [
        this.selectedBackground
    ];
}

export class VisualFormattingSettingsModel
    extends FormattingSettingsModel {
    public valuesCard =
        new ValuesCardSettings();

    public coloursCard =
        new ColoursCardSettings();

    public cards = [
        this.valuesCard,
        this.coloursCard
    ];
}
