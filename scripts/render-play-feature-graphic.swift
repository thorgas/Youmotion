#!/usr/bin/env swift

import AppKit
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
  FileHandle.standardError.write(
    Data("Usage: render-play-feature-graphic.swift <logo.png> <output.png>\n".utf8)
  )
  exit(2)
}

let logoURL = URL(fileURLWithPath: arguments[1])
let outputURL = URL(fileURLWithPath: arguments[2])
let width = 1024
let height = 500

guard let logo = NSImage(contentsOf: logoURL) else {
  FileHandle.standardError.write(Data("Could not read logo at \(logoURL.path)\n".utf8))
  exit(1)
}

guard
  let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: width * 4,
    bitsPerPixel: 32
  ),
  let context = NSGraphicsContext(bitmapImageRep: bitmap)
else {
  FileHandle.standardError.write(Data("Could not create drawing context\n".utf8))
  exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context

let canvas = NSRect(x: 0, y: 0, width: width, height: height)
NSColor(calibratedRed: 0.969, green: 0.961, blue: 0.945, alpha: 1).setFill()
canvas.fill()

NSColor(calibratedRed: 0.902, green: 0.936, blue: 0.916, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: -80, y: 10, width: 510, height: 510)).fill()

NSColor(calibratedRed: 0.950, green: 0.901, blue: 0.879, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: 765, y: 320, width: 330, height: 250)).fill()

logo.draw(
  in: NSRect(x: 38, y: 42, width: 416, height: 416),
  from: .zero,
  operation: .sourceOver,
  fraction: 1
)

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .left

let titleFont = NSFont(name: "Avenir Next Demi Bold", size: 72)
  ?? NSFont.systemFont(ofSize: 72, weight: .semibold)
let bodyFont = NSFont(name: "Avenir Next Medium", size: 32)
  ?? NSFont.systemFont(ofSize: 32, weight: .medium)
let detailFont = NSFont(name: "Avenir Next", size: 22)
  ?? NSFont.systemFont(ofSize: 22)

let ink = NSColor(calibratedRed: 0.145, green: 0.129, blue: 0.114, alpha: 1)
let muted = NSColor(calibratedRed: 0.365, green: 0.337, blue: 0.310, alpha: 1)
let accent = NSColor(calibratedRed: 0.286, green: 0.439, blue: 0.361, alpha: 1)

("Youmotion" as NSString).draw(
  in: NSRect(x: 480, y: 288, width: 500, height: 100),
  withAttributes: [
    .font: titleFont,
    .foregroundColor: ink,
    .paragraphStyle: paragraph,
  ]
)

("Understand what you feel." as NSString).draw(
  in: NSRect(x: 484, y: 218, width: 470, height: 52),
  withAttributes: [
    .font: bodyFont,
    .foregroundColor: muted,
    .paragraphStyle: paragraph,
  ]
)

let divider = NSBezierPath()
divider.move(to: NSPoint(x: 484, y: 190))
divider.line(to: NSPoint(x: 845, y: 190))
divider.lineWidth = 3
accent.setStroke()
divider.stroke()

("Private reflection, on your device." as NSString).draw(
  in: NSRect(x: 484, y: 128, width: 470, height: 42),
  withAttributes: [
    .font: detailFont,
    .foregroundColor: accent,
    .paragraphStyle: paragraph,
  ]
)

context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard
  let flattenedJPEG = bitmap.representation(
    using: .jpeg,
    properties: [.compressionFactor: 1]
  ),
  let flattenedBitmap = NSBitmapImageRep(data: flattenedJPEG),
  let png = flattenedBitmap.representation(using: .png, properties: [:])
else {
  FileHandle.standardError.write(Data("Could not flatten and encode PNG\n".utf8))
  exit(1)
}

do {
  try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
  )
  try png.write(to: outputURL, options: .atomic)
} catch {
  FileHandle.standardError.write(Data("Could not write \(outputURL.path): \(error)\n".utf8))
  exit(1)
}
