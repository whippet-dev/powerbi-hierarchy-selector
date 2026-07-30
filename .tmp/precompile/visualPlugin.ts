import { Visual } from "../../src/visual";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var hierarchySelector91C06B93F80548E6A8D87B1480DF361C: IVisualPlugin = {
    name: 'hierarchySelector91C06B93F80548E6A8D87B1480DF361C',
    displayName: 'HierarchySelector',
    class: 'Visual',
    apiVersion: '5.11.0',
    create: (options?: VisualConstructorOptions) => {
        if (Visual) {
            return new Visual(options);
        }
        throw 'Visual instance not found';
    },
    createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = (<any>globalThis).dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["hierarchySelector91C06B93F80548E6A8D87B1480DF361C"] = hierarchySelector91C06B93F80548E6A8D87B1480DF361C;
}
export default hierarchySelector91C06B93F80548E6A8D87B1480DF361C;