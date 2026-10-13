# Export the supplied logo without redrawing or cropping it. Source remains unchanged.
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSource = [System.Drawing.Bitmap]::new((Join-Path $taskRoot 'assets/favicon-transparent.png'))
$taskRadius = 0.0
for ($taskY = 0; $taskY -lt $taskSource.Height; $taskY++) {
  for ($taskX = 0; $taskX -lt $taskSource.Width; $taskX++) {
    if ($taskSource.GetPixel($taskX,$taskY).A -gt 0) {
      $taskDistance = [Math]::Sqrt([Math]::Pow($taskX+.5-$taskSource.Width/2,2)+[Math]::Pow($taskY+.5-$taskSource.Height/2,2))
      $taskRadius = [Math]::Max($taskRadius,$taskDistance)
    }
  }
}
function Export-KingIcon([int]$taskSize,[string]$taskName,[bool]$taskMaskable) {
  $taskCanvas = [System.Drawing.Bitmap]::new($taskSize,$taskSize)
  $taskGraphics = [System.Drawing.Graphics]::FromImage($taskCanvas)
  $taskGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#ffe23c'))
  $taskGraphics.InterpolationMode = 'HighQualityBicubic'
  $taskGraphics.PixelOffsetMode = 'HighQuality'
  $taskNormalScale = $taskSize*.96/[Math]::Max($taskSource.Width,$taskSource.Height)
  $taskPreviousScale = ($taskSize*.395-2)/$taskRadius
  # Requested midpoint: retain the whole supplied artwork in circle and rounded-square previews.
  # Keep a 2px margin inside the full circle; the previous export used the conservative 40% circle.
  $taskScale = if ($taskMaskable) {[Math]::Min(($taskPreviousScale+$taskNormalScale)/2,($taskSize*.495-2)/$taskRadius)} else {$taskNormalScale}
  $taskWidth = $taskSource.Width*$taskScale
  $taskHeight = $taskSource.Height*$taskScale
  $taskRectangle = [System.Drawing.RectangleF]::new(($taskSize-$taskWidth)/2,($taskSize-$taskHeight)/2,$taskWidth,$taskHeight)
  $taskGraphics.DrawImage($taskSource,$taskRectangle)
  $taskCanvas.Save((Join-Path $taskRoot ('assets/'+$taskName)),[System.Drawing.Imaging.ImageFormat]::Png)
  $taskGraphics.Dispose();$taskCanvas.Dispose()
}
Export-KingIcon 512 'icon-install-v20-512.png' $false
Export-KingIcon 192 'icon-install-v20-192.png' $false
Export-KingIcon 512 'icon-install-maskable-v20-512.png' $true
Export-KingIcon 180 'icon-apple-v20-180.png' $false
Export-KingIcon 48 'favicon-v20.png' $false
$taskSource.Dispose()
Write-Output 'Supplied artwork exported at the requested midpoint for Android; original artwork preserved.'
