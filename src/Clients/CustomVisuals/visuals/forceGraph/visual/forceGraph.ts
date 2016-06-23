/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/*
 *  This file is based on or incorporates material from the projects listed below (Third Party IP). 
 *  The original copyright notice and the license under which Microsoft received such Third Party IP, 
 *  are set forth below. Such licenses and notices are provided for informational purposes only. 
 *  Microsoft licenses the Third Party IP to you under the licensing terms for the Microsoft product. 
 *  Microsoft reserves all other rights not expressly granted under this agreement, whether by 
 *  implication, estoppel or otherwise.
 *  
 *  d3 Force Layout
 *  Copyright (c) 2010-2015, Michael Bostock
 *  All rights reserved.
 *  
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *  
 *  * Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *  
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *  
 *  * The name Michael Bostock may not be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 *  
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 *  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 *  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/// <reference path="../../../_references.ts"/>

module powerbi.visuals.samples {
    import PixelConverter = jsCommon.PixelConverter;

    export enum LinkColorType {
        ByWeight = <any>"By Weight",
        ByLinkType = <any>"By Link Type",
        Interactive = <any>"Interactive"
    }

    export class ForceGraphSettings {
        public static Default = new ForceGraphSettings();
        public static parse(dataView: DataView, capabilities: VisualCapabilities) {
            var settings = new this();
            if(!dataView || !dataView.metadata || !dataView.metadata.objects) {
                return settings;
            }

            var properties = this.getProperties(capabilities);
            for(var objectKey in capabilities.objects) {
                for(var propKey in capabilities.objects[objectKey].properties) {
                    if(!settings[objectKey] || !_.has(settings[objectKey], propKey)) {
                        continue;
                    }

                    var type = capabilities.objects[objectKey].properties[propKey].type;
                    var getValueFn = this.getValueFnByType(type);
                    settings[objectKey][propKey] = getValueFn(
                        dataView.metadata.objects,
                        properties[objectKey][propKey],
                        settings[objectKey][propKey]);
                }
            }

            return settings;
        }

        public static getProperties(capabilities: VisualCapabilities)
            : { [i: string]: { [i: string]: DataViewObjectPropertyIdentifier } } {
            var properties = <any>{};
            for(var objectKey in capabilities.objects) {
                properties[objectKey] = {};
                for(var propKey in capabilities.objects[objectKey].properties) {
                    properties[objectKey][propKey] = <DataViewObjectPropertyIdentifier> {
                        objectName: objectKey,
                        propertyName: propKey
                    };
                }
            }

            return properties;
        }

        public static createEnumTypeFromEnum(type: any): IEnumType {
            var even: any = false;
            return createEnumType(Object.keys(type)
                .filter((key,i) => ((!!(i % 2)) === even && type[key] === key
                    && !void(even === !even)) || (!!(i % 2)) !== even)
                .map(x => <IEnumMember>{ value: x, displayName: x }));
        }

        private static getValueFnByType(type: powerbi.data.DataViewObjectPropertyTypeDescriptor) {
            switch(_.keys(type)[0]) {
                case 'fill': 
                    return DataViewObjects.getFillColor;
                default:
                    return DataViewObjects.getValue;
            }
        }

        public labels = {
            show: true,
            color: dataLabelUtils.defaultLabelColor,
            fontSize: dataLabelUtils.DefaultFontSizeInPt
        };
        public links = {
            showArrow: false,
            showLabel: false,
            colorLink: LinkColorType.Interactive,
            thickenLink: true,
            displayUnits: 0,
            decimalPlaces: <number>null
        };
        public nodes = {
            displayImage: false,
            defaultImage: "Home",
            imageUrl: "",
            imageExt: ".png",
            nameMaxLength: 10,
            highlightReachableLinks: false,
        };
        public size = {
            charge: -15
        };
    }

    export class ForceGraphColumns<T> {
        public static Roles = Object.freeze(
            _.mapValues(new ForceGraphColumns<string>(), (x, i) => i));

        public static getMetadataColumns(dataView: DataView): ForceGraphColumns<DataViewMetadataColumn> {
            var columns = dataView && dataView.metadata && dataView.metadata.columns;
            return columns && _.mapValues(
                new ForceGraphColumns<DataViewMetadataColumn>(),
                (n, i) => columns.filter(x => x.roles && x.roles[i])[0]);
        }

        public static getTableValues(dataView: DataView): ForceGraphColumns<any[]> {
            var table = dataView && dataView.table;
            var columns = this.getMetadataColumns(dataView);
            return columns && table && <any>_.mapValues(
                columns, (n: DataViewMetadataColumn, i) => n && table.rows.map(row => row[n.index]));
        }

        public static getTableRows(dataView: DataView): ForceGraphColumns<any>[] {
            var table = dataView && dataView.table;
            var columns = this.getMetadataColumns(dataView);
            return columns && table && table.rows.map(row =>
                _.mapValues(columns, (n: DataViewMetadataColumn, i) => n && row[n.index]));
        }

        public Source: T = null;
        public Target: T = null;
        public Weight: T = null;
        public LinkType: T = null;
        public SourceType: T = null;
        public TargetType: T = null;
    }

    export interface ForceGraphLink {
        source: ForceGraphNode;
        target: ForceGraphNode;
        weight: number;
        formattedWeight: string;
        type: string;
        tooltipInfo: TooltipDataItem[];
    }

    export interface ForceGraphNode {
        name: string;
        image: string;
        adj: { [i: string]: number };

        x?: number;
        y?: number;
    }

    export interface ForceGraphNodes { 
        [i: string]: ForceGraphNode;
    }

    export interface ForceGraphData {
        nodes: ForceGraphNodes;
        links: ForceGraphLink[];
        minFiles: number;
        maxFiles: number;
        linkedByName: {};
        linkTypes: {};
        settings: ForceGraphSettings;
    }

    export class ForceGraph implements IVisual {
        public static VisualClassName = 'forceGraph';
        private static Count: number = 0;

        private static DefaultValues = {
            defaultLinkColor: "#bbb",
            defaultLinkHighlightColor: "#f00",
            defaultLinkThickness: "1.5px",
        };
        private static get Href(): string {
            return window.location.href.replace(window.location.hash, "");
        }

        private data: ForceGraphData;
        private get settings(): ForceGraphSettings {
            return this.data && this.data.settings;
        }
        private root: D3.Selection;
        private paths: D3.Selection;
        private nodes: D3.Selection;
        private forceLayout: D3.Layout.ForceLayout;
        private dataView: DataView;
        private colors: IDataColorPalette;
        private uniqieId: string = "_" + (ForceGraph.Count++) + "_";

        private marginValue: IMargin;
        private get margin(): IMargin {
            return this.marginValue || { left: 0, right: 0, top: 0, bottom: 0 };
        }
        private set margin(value: IMargin) {
            this.marginValue = $.extend({}, value);
            this.viewportInValue = ForceGraph.substractMargin(this.viewport, this.margin);
        }

        private viewportValue: IViewport;
        private get viewport(): IViewport {
            return this.viewportValue || { width: 0, height: 0 };
        }
        private set viewport(value: IViewport) {
            this.viewportValue = $.extend({}, value);
            this.viewportInValue = ForceGraph.substractMargin(this.viewport, this.margin);
        }

        private viewportInValue: IViewport;
        private get viewportIn(): IViewport {
            return this.viewportInValue || this.viewport;
        }

        private static substractMargin(viewport: IViewport, margin: IMargin): IViewport {
            return {
                width: Math.max(viewport.width - (margin.left + margin.right), 0),
                height: Math.max(viewport.height - (margin.top + margin.bottom), 0)
            };
        }

        private scale1to10(d) {
            var scale = d3.scale.linear().domain([this.data.minFiles, this.data.maxFiles]).rangeRound([1, 10]).clamp(true);
            return scale(d);
        }

        private getLinkColor(d: ForceGraphLink): string {
            switch (this.settings.links.colorLink) {
                case LinkColorType.ByWeight:
                    return this.colors.getColorByIndex(this.scale1to10(d.weight)).value;
                case LinkColorType.ByLinkType:
                    return d.type && this.data.linkTypes[d.type] ? this.data.linkTypes[d.type].color : ForceGraph.DefaultValues.defaultLinkColor;
            };
            return ForceGraph.DefaultValues.defaultLinkColor;
        }

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: ForceGraphColumns.Roles.Source,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Source",
                },
                {
                    name: ForceGraphColumns.Roles.Target,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Target",
                },
                {
                    name: ForceGraphColumns.Roles.Weight,
                    kind: VisualDataRoleKind.Measure,
                    displayName: "Weight",
                },
                {
                    name: ForceGraphColumns.Roles.LinkType,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Link Type",
                    description: "Links can be colored by link types",
                },
                {
                    name: ForceGraphColumns.Roles.SourceType,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Source Type",
                    description: "Source type represents the image name for source entities",
                },
                {
                    name: ForceGraphColumns.Roles.TargetType,
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Target Type",
                    description: "Target type represents the image name for target entities",
                },
            ],
            objects: {
                general: {
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        }
                    }
                },
                labels: {
                    displayName: 'Data labels',
                    properties: {
                        show: {
                            displayName: 'Show',
                            type: { bool: true }
                        },
                        color: {
                            displayName: 'Fill',
                            type: { fill: { solid: { color: true } } }
                        },
                        fontSize: {
                            displayName: 'Text Size',
                            type: { formatting: { fontSize: true } }
                        }
                    }
                },
                links: {
                    displayName: 'Links',
                    properties: {
                        showArrow: {
                            type: { bool: true },
                            displayName: 'Arrow'
                        },
                        showLabel: {
                            type: { bool: true },
                            displayName: 'Label',
                            description: 'Displays weight on links',
                        },
                        colorLink: {
                            type: { enumeration: ForceGraphSettings.createEnumTypeFromEnum(LinkColorType) },
                            displayName: 'Color',
                        },
                        thickenLink: {
                            type: { bool: true },
                            displayName: 'Thickness',
                            description: 'Thickenss of links represents weight',
                        },
                        displayUnits: {
                            displayName: 'Display Units',
                            type: { formatting: { labelDisplayUnits: true } },
                        },
                        decimalPlaces: {
                            displayName: 'Decimal Places',
                            placeHolderText: 'Auto',
                            type: { numeric: true },
                        },
                    }
                },
                nodes: {
                    displayName: 'Nodes',
                    properties: {
                        displayImage: {
                            type: { bool: true },
                            displayName: 'Image',
                            description: 'Images are loaded from image url + source or target type + image extension',
                        },
                        defaultImage: {
                            type: { text: true },
                            displayName: 'Default image'
                        },
                        imageUrl: {
                            type: { text: true },
                            displayName: 'Image url'
                        },
                        imageExt: {
                            type: { text: true },
                            displayName: 'Image extension'
                        },
                        nameMaxLength: {
                            type: { numeric: true },
                            displayName: 'Max name length',
                            description: 'Max length of the name of entities displayed',
                        },
                        highlightReachableLinks: {
                            type: { bool: true },
                            displayName: 'Highlight all reachable links',
                            description: "In interactive mode, whether a node's all reachable links will be highlighted",
                        },
                    }
                },
                size: {
                    displayName: 'Size',
                    properties: {
                        charge: {
                            type: { numeric: true },
                            displayName: 'Charge',
                            description: 'The larger the negative charge the more apart the entities, must be negative but greater than -100',
                        },
                    }
                },
            },
            dataViewMappings: [{
                conditions: [
                    { 
                        'Source': { max: 1 },
                        'Target': { max: 1 },
                        'Weight': { max: 1 },
                        'LinkType': { max: 1 },
                        'SourceType': { max: 1 },
                        'TargetType': { max: 1 } 
                    },
                ],
                categorical: {
                    categories: {
                        for: { in: 'Source' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        select: [
                            { bind: { to: 'Target' } },
                            { bind: { to: 'Weight' } },
                            { bind: { to: 'LinkType' } },
                            { bind: { to: 'SourceType' } },
                            { bind: { to: 'TargetType' } },
                        ],
                    },
                    rowCount: { preferred: { min: 1 } }
                },
            }],
            suppressDefaultTitle: true,
        };

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            var enumeration = new ObjectEnumerationBuilder();

            switch (this.settings && options.objectName) {
                case 'labels':
                    this.enumerateLabels(enumeration);
                    break;
                case 'links':
                    this.enumerateLinks(enumeration);
                    break;
                case 'nodes':
                    this.enumerateNodes(enumeration);
                    break;
                case 'size':
                    this.enumerateSize(enumeration);
                    break;
                default:
                    break;
            }

            return enumeration.complete();
        }

        private enumerateLabels(enumeration: ObjectEnumerationBuilder): void {
            var labels = <VisualObjectInstance>{
                objectName: 'labels',
                selector: null,
                properties: <any>this.settings.labels
            };

            enumeration.pushInstance(labels);
        }

        private enumerateLinks(enumeration: ObjectEnumerationBuilder): void {
            var links = <VisualObjectInstance>{
                objectName: 'links',
                selector: null,
                properties: <any>this.settings.links
            };

            enumeration.pushInstance(links);
        }

        private enumerateNodes(enumeration: ObjectEnumerationBuilder): void {
            var nodes = <VisualObjectInstance>{
                objectName: 'nodes',
                selector: null,
                properties: <any>this.settings.nodes
            };

            enumeration.pushInstance(nodes);
        }

        private enumerateSize(enumeration: ObjectEnumerationBuilder): void {
            var size = <VisualObjectInstance>{
                objectName: 'size',
                selector: null,
                properties: <any>this.settings.size
            };

            enumeration.pushInstance(size);
        }

        public static converter(dataView: DataView, colors: IDataColorPalette): ForceGraphData {
            var categorical: DataViewCategorical = dataView.categorical;
            var settings = ForceGraph.parseSettings(dataView);
            var nodes: ForceGraphNodes = {};
            var minFiles = Number.MAX_VALUE;
            var maxFiles = 0;
            var linkedByName = {};
            var links: ForceGraphLink[] = [];
            var linkDataPoints = {};
            var linkTypeCount = 0;
            var tooltipInfo: TooltipDataItem[] = [];

            var metadata = ForceGraphColumns.getMetadataColumns(dataView);
            if(!metadata || !metadata.Source || !metadata.Target) {
                return null;
            }

            var tableRows = ForceGraphColumns.getTableRows(dataView);

            var formatStringProp = ForceGraphSettings.getProperties(ForceGraph.capabilities)['general']['formatString'];
            var categorySourceFormatString = valueFormatter.getFormatString(categorical.categories[0].source, formatStringProp);
            var categoryTargetFormatString = valueFormatter.getFormatString(categorical.categories[1].source, formatStringProp);
            var weightFormatter: IValueFormatter = metadata.Weight && valueFormatter.create({
                format: valueFormatter.getFormatString(metadata.Weight, formatStringProp, true),
                precision: settings.links.decimalPlaces,
                value: settings.links.displayUnits || _.max(tableRows, x => x.Weight).Weight
            });

            tableRows.forEach(x => {
                linkedByName[x.Source + "," + x.Target] = 1;
                var source = nodes[x.Source] || (nodes[x.Source] = { name: x.Source, image: x.SourceType || "", adj: {} });
                var target = nodes[x.Target] || (nodes[x.Target] = { name: x.Target, image: x.TargetType || "", adj: {} });
                source.adj[target.name] = 1;
                target.adj[source.name] = 1;

                tooltipInfo = [{
                    displayName: dataView.metadata.columns[0].displayName,
                    value: valueFormatter.format(source.name, categorySourceFormatString)
                }, {
                    displayName: dataView.metadata.columns[1].displayName,
                    value: valueFormatter.format(target.name, categoryTargetFormatString)
                }];

                if (metadata.Weight) {
                    tooltipInfo.push({
                        displayName: dataView.metadata.columns[2].displayName,
                        value: x.Weight
                    });
                }

                var link = <ForceGraphLink>{
                    source: source,
                    target: target,
                    weight: Math.max(x.Weight, 0),
                    formattedWeight: x.Weight && weightFormatter.format(x.Weight),
                    type: x.LinkType || "",
                    tooltipInfo: tooltipInfo,
                };

                if (metadata.LinkType) {
                    if (!linkDataPoints[x.LinkType]) {
                        linkDataPoints[x.LinkType] = {
                            label: x.LinkType,
                            color: colors.getColorByIndex(linkTypeCount++).value,
                        };
                    };
                };
                if (link.weight < minFiles) { minFiles = link.weight; };
                if (link.weight > maxFiles) { maxFiles = link.weight; };
                links.push(link);
            });

            return {
                nodes: nodes,
                links: links,
                minFiles: minFiles,
                maxFiles: maxFiles,
                linkedByName: linkedByName,
                linkTypes: linkDataPoints,
                settings
            };
        }

        private static parseSettings(dataView: DataView): ForceGraphSettings {
            var settings = ForceGraphSettings.parse(dataView, ForceGraph.capabilities);
            settings.size.charge = Math.min(Math.max(settings.size.charge, -100), -0.1);
            settings.links.decimalPlaces = settings.links.decimalPlaces && Math.min(Math.max(settings.links.decimalPlaces, 0), 5);
            return settings;
        }

        public init(options: VisualInitOptions): void {
            this.root = d3.select(options.element.get(0));
            this.forceLayout = d3.layout.force();
            this.colors = options.style.colorPalette.dataColors;
        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || (options.dataViews.length < 1)) return;
            this.data = ForceGraph.converter(this.dataView = options.dataViews[0], this.colors);
            if (!this.data) return;

            this.viewport = options.viewport;
            var k = Math.sqrt(Object.keys(this.data.nodes).length / (this.viewport.width * this.viewport.height));

            this.root.selectAll("svg").remove();

            var svg = this.root
                .append("svg")
                .attr("width", this.viewport.width)
                .attr("height", this.viewport.height)
                .classed(ForceGraph.VisualClassName, true);

            this.forceLayout
                .gravity(100 * k)
                .links(this.data.links)
                .size([this.viewport.width, this.viewport.height])
                .linkDistance(100)
                .charge(this.settings.size.charge / k)
                .on("tick", this.tick());
            this.updateNodes();
            this.forceLayout.start();

            // uncomment if we don't need the marker-end workaround
            //if (this.settings.showArrow) {
            // build the arrow.
            //function marker(d, i) {
            //    var val = "mid_" + i;
            //    svg.append("defs").selectAll("marker")
            //        .data([val])      // Different link/path types can be defined here
            //        .enter().append("marker")    // This section adds in the arrows
            //        .attr("id", String)
            //        .attr("viewBox", "0 -5 10 10")
            //        .attr("refX", 10)
            //        .attr("refY", 0)
            //        .attr("markerWidth", 6)
            //        .attr("markerHeight", 6)
            //        .attr("orient", "auto")
            //        .attr("markerUnits", "userSpaceOnUse")
            //        .append("path")
            //        .attr("d", "M0,-5L10,0L0,5")
            //    //below works if no marker-end workaround needed
            //        .style("fill", d => this.getLinkColor(d))
            //    ;
            //    return "url(#" + val + ")";
            //}
            //}
            this.paths = svg.selectAll(".link")
                .data(this.forceLayout.links())
                .enter().append("path")
                .attr("class", "link")
                .attr("id", (d, i) => "linkid_" + this.uniqieId + i)
                // uncomment if we don't need the marker-end workaround
                //.attr("marker-end", function (d, i) { return marker(d, i); })
                .attr("stroke-width", (d: ForceGraphLink) => this.settings.links.thickenLink ? this.scale1to10(d.weight) : ForceGraph.DefaultValues.defaultLinkThickness)
                .style("stroke", (d: ForceGraphLink) => this.getLinkColor(d))
                // no need for "fill" if we don't need the marker-end workaround
                .style("fill", (d: ForceGraphLink) => { if (this.settings.links.showArrow) return this.getLinkColor(d); })
                .on("mouseover", this.fadePath(.3, ForceGraph.DefaultValues.defaultLinkHighlightColor))
                .on("mouseout", this.fadePath(1, ForceGraph.DefaultValues.defaultLinkColor));

            TooltipManager.addTooltip(this.paths, (tooltipEvent: TooltipEvent) => {
                return tooltipEvent.data.tooltipInfo;
            });

            if (this.settings.links.showLabel) {
                var linklabelholderUpdate = svg.selectAll(".linklabelholder").data(this.forceLayout.links());
                linklabelholderUpdate.enter()
                    .append("g")
                    .attr("class", "linklabelholder")
                    .append("text")
                    .attr("class", "linklabel")
                    .attr("y", "-12")
                    .attr("text-anchor", "middle")
                    .style("fill", "#000")
                    .append("textPath")
                    .attr("xlink:href", (d, i) => ForceGraph.Href + "#linkid_" + this.uniqieId + i)
                    .attr("startOffset", "25%") //use "50%" if we don't need the marker-end workaround
                    .text((d: ForceGraphLink) => this.settings.links.colorLink === LinkColorType.ByLinkType ? d.type : d.formattedWeight);

                linklabelholderUpdate.exit().remove();
            }

            // define the nodes
            this.nodes = svg.selectAll(".node")
                .data(this.forceLayout.nodes())
                .enter().append("g")
                .attr("class", "node")
                .call(this.forceLayout.drag)
                .on("mouseover", this.fadeNode(.3, ForceGraph.DefaultValues.defaultLinkHighlightColor))
                .on("mouseout", this.fadeNode(1, ForceGraph.DefaultValues.defaultLinkColor))
                .on("mousedown", () => d3.event.stopPropagation())
                .attr("drag-resize-disabled", true);

            // add the nodes
            if (this.settings.nodes.displayImage) {
                this.nodes.append("image")
                    .attr("xlink:href", (d: ForceGraphNode) =>
                        d.image && d.image !== '' ?
                            this.settings.nodes.imageUrl + d.image + this.settings.nodes.imageExt :
                            (
                                this.settings.nodes.defaultImage && this.settings.nodes.defaultImage !== '' ?
                                    this.settings.nodes.imageUrl + this.settings.nodes.defaultImage + this.settings.nodes.imageExt :
                                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAbCAMAAAHNDTTxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACuUExURQAAAMbGxvLy8sfHx/Hx8fLy8vHx8cnJycrKyvHx8fHx8cvLy/Ly8szMzM3NzfHx8dDQ0PHx8fLy8vHx8e/v79LS0tPT0/Ly8tTU1NXV1dbW1vHx8fHx8fDw8NjY2PT09PLy8vLy8vHx8fLy8vHx8fHx8enp6fDw8PLy8uPj4+Tk5OXl5fHx8b+/v/Pz8+bm5vHx8ejo6PLy8vHx8fLy8sTExPLy8vLy8sXFxfHx8YCtMbUAAAA6dFJOUwD/k/+b7/f///+r/////0z/w1RcEP//ZP///4fj/v8Yj3yXn/unDEhQ////YP9Y/8//aIMU/9+L/+fzC4s1AAAACXBIWXMAABcRAAAXEQHKJvM/AAABQElEQVQoU5WS61LCMBCFFymlwSPKVdACIgWkuNyL+P4v5ibZ0jKjP/xm0uw5ySa7mRItAhnMoIC5TwQZdCZiZjcoC8WU6EVsmZgzoqGdxafgvJAvjUXCb2M+0cXNsd/GDarZqSf7av3M2P1E3xhfLkPUvLD5joEYwVVJQXM6+9McWUwLf4nDTCQZAy96UoDjNI/jhl3xPLbQamu8xD7iaIsPKw7GJ7KZEnWLY3Gi8EFj5nqibXnwD5VEGjJXk5sbpLppfvvo1RazQVrhSopPK4TODrtnjS3dY4ic8KurruWQYF+UG60BacexTMyT2jlNg41dOmKvTpkUd/Jevy7ZxQ61ULRUpoododx8GeDPvIrktbFVdUsK6f8Na5VlVpjZJtowTXVy7kfXF5wCaV1tqXAFuIdWJu+JviaQzNzfQvQDGKRXXEmy83cAAAAASUVORK5CYII='
                            )
                    )
                    .attr("x", "-12px")
                    .attr("y", "-12px")
                    .attr("width", "24px")
                    .attr("height", "24px");
            } else {
                this.nodes.append("circle")
                    .attr("r", (d: ForceGraphLink) => d.weight < 5 ? 5 : d.weight);
            }

            // add the text
            if (this.settings.labels.show) {
                this.nodes.append("text")
                    .attr({
                        x: 12,
                        dy: ".35em"
                    })
                    .style({
                        fill: this.settings.labels.color,
                        'font-size': PixelConverter.fromPoint(this.settings.labels.fontSize)
                    })
                    .text((d: ForceGraphNode) => d.name ? (d.name.length > this.settings.nodes.nameMaxLength
                        ? d.name.substr(0, this.settings.nodes.nameMaxLength)
                        : d.name) : '');
            }
        }

        private updateNodes() {
            var oldNodes = this.forceLayout.nodes();
            this.forceLayout.nodes(d3.values(this.data.nodes));
            this.forceLayout.nodes().forEach((node, i) => {
                if (!oldNodes[i]) {
                    return;
                }
                node.x = oldNodes[i].x;
                node.y = oldNodes[i].y;
                node.px = oldNodes[i].px;
                node.py = oldNodes[i].py;
                node.weight = oldNodes[i].weight;
            });
        }

        private tick() {
            var viewport = this.viewportIn;
            // limitX and limitY is necessary when you minimize the graph and then resize it to normal.
            //"width/height * 20" seems enough to move nodes freely by force layout.
            var maxWidth = viewport.width * 20;
            var maxHeight = viewport.height * 20;
            var limitX = x => Math.max((viewport.width - maxWidth) / 2, Math.min((viewport.width + maxWidth) / 2, x));
            var limitY = y => Math.max((viewport.height - maxHeight) / 2, Math.min((viewport.height + maxHeight) / 2, y));
            //use this if we don't need the marker-end workaround
            //path.attr("d", function (d) {
            //    var dx = d.target.x - d.source.x,
            //        dy = d.target.y - d.source.y,
            //        dr = Math.sqrt(dx * dx + dy * dy);
            //    // x and y distances from center to outside edge of target node
            //    var offsetX = (dx * d.target.radius) / dr;
            //    var offsetY = (dy * d.target.radius) / dr;
            //    return "M" +
            //        d.source.x + "," +
            //        d.source.y + "A" +
            //        dr + "," + dr + " 0 0,1 " +
            //        (d.target.x - offsetX) + "," +
            //        (d.target.y - offsetY);
            //});

            var getPath = this.settings.links.showArrow ?
                //this is for marker-end workaround, build the marker with the path
                (d: ForceGraphLink) => {
                    d.source.x = limitX(d.source.x);
                    d.source.y = limitY(d.source.y);
                    d.target.x = limitX(d.target.x);
                    d.target.y = limitY(d.target.y);
                    var dx = d.target.x - d.source.x,
                        dy = d.target.y - d.source.y,
                        dr = Math.sqrt(dx * dx + dy * dy),
                        theta = Math.atan2(dy, dx) + Math.PI / 7.85,
                        d90 = Math.PI / 2,
                        dtxs = d.target.x - 6 * Math.cos(theta),
                        dtys = d.target.y - 6 * Math.sin(theta);
                    return "M" +
                        d.source.x + "," +
                        d.source.y + "A" +
                        dr + "," + dr + " 0 0 1," +
                        d.target.x + "," +
                        d.target.y +
                        "A" + dr + "," + dr + " 0 0 0," + d.source.x + "," + d.source.y + "M" + dtxs + "," + dtys + "l" + (3.5 * Math.cos(d90 - theta) - 10 * Math.cos(theta)) + "," + (-3.5 * Math.sin(d90 - theta) - 10 * Math.sin(theta)) + "L" + (dtxs - 3.5 * Math.cos(d90 - theta) - 10 * Math.cos(theta)) + "," + (dtys + 3.5 * Math.sin(d90 - theta) - 10 * Math.sin(theta)) + "z";
                } :
                (d: ForceGraphLink) => {
                    d.source.x = limitX(d.source.x);
                    d.source.y = limitY(d.source.y);
                    d.target.x = limitX(d.target.x);
                    d.target.y = limitY(d.target.y);
                    var dx = d.target.x - d.source.x,
                        dy = d.target.y - d.source.y,
                        dr = Math.sqrt(dx * dx + dy * dy);
                    return "M" +
                        d.source.x + "," +
                        d.source.y + "A" +
                        dr + "," + dr + " 0 0,1 " +
                        d.target.x + "," +
                        d.target.y;
                };

            return () => {
                this.paths.each(function() { this.parentNode.insertBefore(this, this); });
                this.paths.attr("d", getPath);
                this.nodes.attr("transform", d => "translate(" + limitX(d.x) + "," + limitY(d.y) + ")");
            };
        }

        private fadePath(opacity: number, highlight: string) {
            if (this.settings.links.colorLink !== LinkColorType.Interactive) return;
            return (d: ForceGraphLink) => {
                this.paths.style("stroke-opacity", (o: ForceGraphLink) => o.source === d.source && o.target === d.target ? 1 : opacity);
                this.paths.style("stroke", (o: ForceGraphLink) => o.source === d.source && o.target === d.target ? highlight : ForceGraph.DefaultValues.defaultLinkColor);
            };
        }

        private isReachable(a: ForceGraphNode, b: ForceGraphNode): boolean {
            if (a.name === b.name) return true;
            if (this.data.linkedByName[a.name + "," + b.name]) return true;
            var visited = {};
            for (var name in this.data.nodes) {
                visited[name] = false;
            };
            visited[a.name] = true;

            var stack = [];
            stack.push(a.name);
            while (stack.length > 0) {
                var cur = stack.pop();
                var node = this.data.nodes[cur];
                for (var nb in node.adj) {
                    if (nb === b.name) return true;

                    if (!visited[nb]) {
                        visited[nb] = true;
                        stack.push(nb);
                    }
                }
            };
            return false;
        }

        private fadeNode(opacity: number, highlight: string) {
            if (this.settings.links.colorLink !== LinkColorType.Interactive) return;
            var isConnected = (a: ForceGraphNode, b: ForceGraphNode) => this.data.linkedByName[a.name + "," + b.name]
                || this.data.linkedByName[b.name + "," + a.name] || a.name === b.name;

            return (d: ForceGraphNode) => {
                var that = this;
                this.nodes.style("stroke-opacity", function(o: ForceGraphNode) {
                    var thisOpacity = (that.settings.nodes.highlightReachableLinks ? that.isReachable(d, o) : isConnected(d, o)) ? 1 : opacity;
                    this.setAttribute('fill-opacity', thisOpacity);
                    return thisOpacity;
                });

                this.paths.style("stroke-opacity", (o: ForceGraphLink) =>
                    (this.settings.nodes.highlightReachableLinks ? this.isReachable(d, o.source) :
                        (o.source === d || o.target === d)) ? 1 : opacity);
                this.paths.style("stroke", (o: ForceGraphLink) =>
                    (this.settings.nodes.highlightReachableLinks ? this.isReachable(d, o.source) :
                        (o.source === d || o.target === d)) ? highlight : ForceGraph.DefaultValues.defaultLinkColor);
            };
        }

        public destroy(): void {
            this.root = null;
        }
    }
}