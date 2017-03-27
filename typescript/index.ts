const SERVICE_URL = "https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];
/*
   "baseTemperature": 8.66,
  "monthlyVariance": [
    {
      "year": 1753,
      "month": 1,
      "variance": -1.366
    },
    {
      "year": 1753,
      "month": 2,
      "variance": -2.223
    },
    */


require("./sass/styles.scss");

import * as D3 from 'd3';
import {sprintf} from 'sprintf-js';

class HeatRecord 
{
    variance:number;
    monthYear:Date;

    constructor(year:number, month:number, variance:number)
    {
        this.variance = variance;
        this.monthYear = new Date(year, month - 1);
    }
}
class Temperature 
{
    //http://www.jacklmoore.com/notes/rounding-in-javascript/    
    static round(value:number, decimals:number) {
        return Number(value.toExponential(decimals));
    }
}
class Margin {
    top: number;
    right: number;
    bottom: number;
    left: number;

    constructor(top:number, right:number, bottom:number, left:number)
    {
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left= left;
    }    
}
class HeatMap
{
    height:number;
    width:number;
    margin:Margin;
    
    xScale: HorizontalScale;
    yScale: VerticalScale;
    colorScale: ColorScale;

    chartData: any;
    svgChart: any;
    
    baseTemperature:number;
    
    minVariance:number;
    maxVariance:number;
    
    minDate:Date;
    maxDate:Date;

    constructor()
    {
        this.margin = new Margin(35, 40, 180, 120);
        this.height = 650 - this.margin.top - this.margin.bottom;
        this.width = 1300 - this.margin.left - this.margin.right;
        this.chartData = [];
        this.fetchData();
    }
    fetchData()
    {
        let tempData:HeatRecord[] = [];
        
        let _this = this;
        D3.json(SERVICE_URL, d => 
        {
            debugger;
            _this.baseTemperature = d.baseTemperature;

            d.monthlyVariance.forEach(i => 
            {
                tempData.push(new HeatRecord(i.year, i.month, i.variance));
            });
            
            _this.minVariance = D3.min(tempData, (d:HeatRecord) => {
                return d.variance;
            });

             _this.maxVariance = D3.max(tempData, (d:HeatRecord) => 
            {
                return d.variance;
            });

            _this.minDate = D3.min(tempData, (d:HeatRecord) => {
                    return d.monthYear;
                });        
            
            _this.maxDate = D3.max(tempData, (d:HeatRecord) => {
                    return d.monthYear;
                });

            _this.chartData = D3.nest().key((d:HeatRecord) => 
            {
                return d.monthYear.getMonth().toString();
            })
            .entries(tempData);
            
            _this.createChart();
        });
    }
    createChart()
    {
        //when creating the svg chart, "this" is a reference to the svg object not the object instance
        //store the object data in local variables
        let width:number = this.width;
        let height:number = this.height;
        let margin:Margin = this.margin;
        let chartData:Array<any> = this.chartData;

        //http://tech.just-eat.com/2014/03/11/creating-a-heat-map-with-d3/
        //http://jonathansoma.com/tutorials/d3/color-scale-examples/

        this.yScale = new VerticalScale(this.height);

        this.colorScale = new ColorScale(this.baseTemperature + this.minVariance, this.baseTemperature + this.maxVariance);

        this.xScale = new HorizontalScale(this.width, this.minDate, this.maxDate);

        let self = this;
        this.svgChart = D3.select("#chart")
            .append("svg")
            .style("background", "#FFF")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            
        let baseTemperature = this.baseTemperature;
        let tooltip = Tooltip.get();
        
        for (let i = 0; i < MONTH_NAMES.length; i++) 
        {
            this.svgChart.append("g")
                .attr("transform", "translate(" + margin.left + ", " + margin.top +")")
                .selectAll("rect")
                .data(this.chartData[i.toString()]["values"])
                .enter()
                .append("rect")
                .attr("transform", "translate(" + margin.left + ", " + margin.top +")")
                .style("fill", (d:HeatRecord) => 
                {
                    return this.colorScale.scale(Temperature.round(self.baseTemperature + d.variance, 3));
                })
                .attr("x", (d:HeatRecord) => 
                {
                    return self.xScale.scale(d.monthYear) - margin.left;
                })
                .attr("y", (d:HeatRecord) => 
                {
                    return (height / 12) * (i - 1);
                })
                .attr("width", 5)
                .attr("height", (d:HeatRecord) => 
                {
                    return height / 12;                   
                })
                .on("mouseover", (d:HeatRecord) => 
                {   
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    
                    tooltip.html(Tooltip.getText(d, self.baseTemperature))
                    .style("left", D3.event.pageX.toString() + "px")
                    .style("top", (D3.event.pageY - 100).toString() + "px");
                    
                    D3.select(D3.event.currentTarget)
                        .style("cursor", "pointer");
                })
                .on("mouseout", () => 
                {   
                    tooltip
                    .transition()
                    .duration(500)
                    .style("opacity", 0);
                });        
        }
        
        this.addHorizontalAxis();
        this.addVerticalAxis();

        let legend = new Legend(this);
        legend.addColorBoxes();
        legend.addLabels();
        
    }
    addHorizontalAxis()
    {
        let axis = D3.axisBottom(this.xScale.scale)
            .ticks(D3.timeYear, 10)
            .tickFormat(D3.timeFormat("%Y"));
            
        let xAxisLabel = new Label(new Point(this.width / 2 + 100, this.height + this.margin.top + 40), 
            "Years", false);

        let xAxis = new Axis(this);
        xAxis.add(axis, new Point(this.margin.left, this.margin.top + this.height), xAxisLabel);
    }
    addVerticalAxis()
    {
        let height:number = this.height;
        
        let axis = D3.axisLeft(this.yScale.scale)
            .tickFormat(D3.timeFormat("%B"));
            
        let yAxisLabel =  new Label(new Point(this.height / 2 - this.height, this.margin.right), 
            "Months", true);

        let xAxis = new Axis(this);
        xAxis.add(axis, new Point(this.margin.left, this.margin.top), yAxisLabel);
    }
}
class Point
{
    x:number;
    y:number;

    constructor(x:number, y:number)
    {
        this.x = x;
        this.y = y;
    }
}
class Label
{
    location:Point;
    text:string;
    vertical:boolean;

    constructor(location:Point, text:string, vertical:boolean)
    {
        this.location = location;
        this.text = text;
        this.vertical = vertical;
    }
}
class Axis
{
    chart:HeatMap;
    constructor(chart:HeatMap)
    {
        this.chart = chart;
    }
    add(axis:D3.Axis<any>, location:Point, label:Label)
    {
        let height = this.chart.height;
        let margin = this.chart.margin;

        let hGuide = chart.svgChart.append("g").style("font-size", "12px").call(axis);

        hGuide.attr("transform", "translate (" + location.x + ", " + 
            location.y + ")")
            .selectAll("path")
                .style("fill", "none")
                .style("stroke", "#000")
            .selectAll("line")
                .style("stroke", "#000");
        
        this.addLabel(label);
    }
    addLabel(label:Label)
    {
        let svgLabel = chart.svgChart.append("g")
                .append("text")
                .style("font-weight", "bold")
                .attr("y", label.location.y)
                .attr("x", label.location.x)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text(label.text); 

        if (label.vertical) 
            svgLabel.attr("transform", "rotate(-90)");
    }
}
interface IChartScale
{
    scale:D3.AxisScale<any>;
}
class VerticalScale implements IChartScale
{
    scale:D3.ScaleTime<number,number>;

    constructor(chartHeight: number)
    {
        this.scale = D3.scaleTime()
            .domain([new Date(2017, 0, 1), new Date(2017, 11, 1)])
            .range([0, chartHeight]);
    }
}
class HorizontalScale implements IChartScale
{
    scale:D3.ScaleTime<number,number>;

    constructor(chartWidth: number, minDate:Date, maxDate:Date)
    {
        this.scale = D3.scaleTime()
            .domain([minDate, maxDate])
            .range([0, chartWidth]);

    }
}
class ColorScale
{
    scale:D3.ScaleQuantile<string>;
    colors:string[];

    constructor(minTemperature: number, maxTemperature: number)
    {
        this.colors = ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598",
        "#ffffbf", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"];

        this.scale = D3.scaleQuantile<string>()
            .domain([minTemperature, maxTemperature])
            .range(this.colors);
    }
}
class Legend
{
    x:number;
    width:number;
    quantiles:number[];
    svgChart:any;

    constructor(chart: HeatMap)
    {
        this.quantiles = chart.colorScale.scale.quantiles();
        this.quantiles.unshift(0); 
        this.width = 25;
        this.x = chart.width - (this.width * chart.colorScale.colors.length) + chart.margin.left;
        this.svgChart = chart.svgChart;  
    }
    addColorBoxes()
    {
        let self = this;
        
        this.svgChart
        .append("g")
        .selectAll("rect")
        .data(chart.colorScale.colors)
        .enter()
        .append("rect")
        .style("fill", d => 
        {
            return d;
        })
        .attr("width", this.width)
        .attr("height", 10)
        .attr("x", (x,i) => {
            return this.x + (i * this.width);
        })
        .attr("y", (y,i) => {
            return chart.height + chart.margin.bottom - chart.margin.top;
        });

        this.addLabels();
    }
    addLabels()
    {
        this.svgChart.append("g").selectAll("text")
            .data(this.quantiles)
            .enter()
            .append("text")
            .style("text-anchor", "middle")
            .attr("x", (x, i) => {
                return this.x + (i * this.width) + 10;
            })
            .attr("y", (y,i) => {
                return chart.height + chart.margin.bottom - chart.margin.top + 30;
            })
            .text(t => 
            {
                t = Temperature.round(t, 1);

                return t.toString().length === 1 ? t + ".0" : t
            }
            );
    }
}
class Tooltip
{
    static get():any
    {
       return D3.select("#tooltip")
            .append("div")
            .style("pointer-events", "none")
            .style("position", "absolute")
            .style("padding", "10px")
            .style("background", "black")
            .style("color", "white")
            .style("width", "150px")
            .style("opacity", 0);
    }

    static getText(heatRecord:HeatRecord, baseTemp:number):string
    {
        return sprintf("%s - %s<br/>%s &#x2103;<br/>%s &#x2103;", 
            heatRecord.monthYear.getFullYear(), MONTH_NAMES[heatRecord.monthYear.getMonth()], 
            Temperature.round(heatRecord.variance + baseTemp, 3), Temperature.round(heatRecord.variance, 3)); 
    }
}
let chart = new HeatMap();