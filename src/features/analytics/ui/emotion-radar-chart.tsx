import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { RadarChart, type RadarSeriesOption } from 'echarts/charts';
import {
  RadarComponent,
  type RadarComponentOption,
} from 'echarts/components';
import {
  init,
  use as registerECharts,
  type ComposeOption,
  type EChartsType,
} from 'echarts/core';
import { PureComponent, createRef } from 'react';
import { StyleSheet, View } from 'react-native';
import assert from 'tiny-invariant';

import { APP_TYPE } from '@/constants';
import { palette } from '@/theme';
import type { EmotionFrequency } from '../domain/check-in-analytics';

registerECharts([RadarChart, RadarComponent, SVGRenderer]);

type RadarOption = ComposeOption<RadarComponentOption | RadarSeriesOption>;

type EmotionRadarChartProps = Readonly<{
  colors: readonly string[];
  frequencies: readonly EmotionFrequency[];
  labels: readonly string[];
  width: number;
}>;

const CHART_HEIGHT = 292;

export class EmotionRadarChart extends PureComponent<EmotionRadarChartProps> {
  private readonly _chartRef = createRef<HTMLElement>();
  private _chart: EChartsType | null = null;

  override componentDidMount() {
    assert(this.props.width > 0 && Number.isFinite(this.props.width), 'Radar chart requires a positive finite width.');
    assert(this.props.frequencies.length === this.props.labels.length, 'Radar frequencies and labels must align.');
    const element = this._chartRef.current;
    if (!element) return;
    this._chart = init(element, null, {
      renderer: 'svg',
      width: this.props.width,
      height: CHART_HEIGHT,
    });
    this._chart.setOption(this._option());
  }

  override componentDidUpdate(previous: EmotionRadarChartProps) {
    assert(previous.width > 0 && Number.isFinite(previous.width), 'Previous radar width must be positive and finite.');
    assert(this.props.colors.length === this.props.labels.length, 'Radar colors and labels must align.');
    if (!this._chart) return;
    if (previous.width !== this.props.width) {
      this._chart.resize({ width: this.props.width, height: CHART_HEIGHT });
    }
    this._chart.setOption(this._option(), true);
  }

  override componentWillUnmount() {
    assert(this._chart === null || !this._chart.isDisposed(), 'Mounted radar chart cannot already be disposed.');
    assert(this.props.width > 0 && Number.isFinite(this.props.width), 'Unmounted radar chart must retain a valid width.');
    this._chart?.dispose();
    this._chart = null;
  }

  private _option(): RadarOption {
    assert(this.props.frequencies.length === this.props.labels.length, 'Radar frequencies and labels must align.');
    assert(this.props.colors.length === this.props.labels.length, 'Radar colors and labels must align.');
    const maximum = Math.max(...this.props.frequencies.map(({ count }) => count), 1);
    const emotionLabelStyles: Record<string, {
      color: string;
      fontFamily: string;
      fontSize: number;
    }> = {};
    this.props.colors.forEach((color, index) => {
      emotionLabelStyles[`emotion${index}`] = {
        color,
        fontFamily: APP_TYPE.semibold,
        fontSize: 13,
      };
    });
    return {
      animation: false,
      radar: {
        axisLine: { lineStyle: { color: 'rgba(42, 39, 34, 0.16)' } },
        axisName: {
          color: palette.ink,
          fontFamily: APP_TYPE.medium,
          fontSize: 12,
          formatter: (name?: string) => {
            if (!name) return '';
            assert(name.length > 0, 'Radar formatter requires a nonempty label.');
            const index = this.props.labels.indexOf(name);
            assert(index >= -1 && index < this.props.labels.length, 'Radar label lookup returned an invalid index.');
            return index < 0 ? name : `{emotion${index}|●} {label|${name}}`;
          },
          rich: {
            ...emotionLabelStyles,
            label: {
              color: palette.ink,
              fontFamily: APP_TYPE.medium,
              fontSize: 12,
            },
          },
        },
        center: ['50%', '51%'],
        indicator: this.props.labels.map((name) => ({ name, max: maximum })),
        radius: '66%',
        shape: 'circle',
        splitArea: {
          areaStyle: {
            color: ['rgba(94, 111, 97, 0.02)', 'rgba(94, 111, 97, 0.06)'],
          },
        },
        splitLine: { lineStyle: { color: 'rgba(42, 39, 34, 0.10)' } },
        splitNumber: 4,
      },
      series: [{
        areaStyle: { color: 'rgba(94, 111, 97, 0.24)' },
        data: [{ value: this.props.frequencies.map(({ count }) => count) }],
        lineStyle: { color: palette.moss, width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: palette.moss },
        type: 'radar',
      }],
    };
  }

  override render() {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.chart, { width: this.props.width }]}
        testID="analytics-emotion-radar"
      >
        <SvgChart ref={this._chartRef} style={styles.chartCanvas} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  chart: { alignSelf: 'center', height: CHART_HEIGHT },
  chartCanvas: { height: CHART_HEIGHT },
});
