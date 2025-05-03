package handlers

import (
	"context"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/configs"
	"github.com/pardnchiu/golang-image-caching-server/internal/utils"
)

func GetFromPath(c *gin.Context) {
	imgSize := utils.GetQuery(c, []string{"s", "size"}, "")
	imgWidth := utils.GetQuery(c, []string{"w", "width"}, "")
	imgHeight := utils.GetQuery(c, []string{"h", "height"}, "")
	imgOrigin := utils.GetQuery(c, []string{"o", "origin"}, "0")
	imgDark := utils.GetQuery(c, []string{"d", "dark"}, "")
	imgBlur := utils.GetQuery(c, []string{"b", "blur"}, "")
	imgBright := utils.GetQuery(c, []string{"B", "bright"}, "1")
	imgType := utils.GetQuery(c, []string{"t", "type"}, "")
	imgQuality := utils.GetQuery(c, []string{"q", "quality"}, "")

	if imgType == "" || !CheckImageType(imgType) {
		imgType = "webp"
	} else if imgType == "jpeg" {
		imgType = "jpg"
	}

	path := c.Param("path")
	filePath := configs.GetUploadPath() + "/" + strings.TrimPrefix(path, "/")

	// 設置快取控制標頭
	cacheTime := strconv.Itoa(86400 * 7)
	c.Header("Cache-Control", "public, max-age="+cacheTime)

	// 設置過期時間
	expireTime := time.Now().Add(time.Duration(86400*7) * time.Second)
	c.Header("Expires", expireTime.Format(time.RFC1123))

	if strings.HasSuffix(filePath, ".pdf") {
		c.Header("Content-Type", "application/pdf")
		c.File(filePath)
		return
	} else if strings.HasSuffix(filePath, ".svg") {
		c.Header("Content-Type", "image/svg+xml")
		c.File(filePath)
		return
	} else if imgOrigin == "1" {
		mimeType := GetMimeType(filePath)
		c.Header("Content-Type", mimeType)
		c.File(filePath)
		return
	}

	cachePath := GetFileCachePath(path, imgSize, imgWidth, imgHeight, imgType, imgQuality, imgBlur, imgBright)

	if cacheFile, err := os.ReadFile(cachePath); err == nil {
		switch imgType {
		case "jpg":
			c.Header("Content-Type", "image/jpeg")
		case "png":
			c.Header("Content-Type", "image/png")
		case "avif":
			c.Header("Content-Type", "image/avif")
		default:
			c.Header("Content-Type", "image/webp")
		}
		c.Data(http.StatusOK, c.GetHeader("Content-Type"), cacheFile)
		return
	}

	// * set timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	type Result struct {
		buffer     []byte
		err        error
		errMessage string
	}
	resultCh := make(chan Result)

	go func() {
		var result Result
		var buffer []byte

		// * if folder not exist, create it
		cacheFolder := filepath.Dir(cachePath)
		if err := os.MkdirAll(cacheFolder, 0755); err != nil {
			result.err = err
			result.errMessage = "can not create folder"
			resultCh <- result
			return
		}

		// * check file is exist or not
		imgFile, err := os.ReadFile(filePath)
		if err != nil {
			result.err = err
			result.errMessage = "file not exist: /" + path
			resultCh <- result
			return
		}

		// * trans file to buffer
		imageBuffer, err := vips.NewImageFromBuffer(imgFile)
		if err != nil {
			result.err = err
			result.errMessage = "can not get buffer data: /" + path
			resultCh <- result
		}
		// * release after end
		defer imageBuffer.Close()

		// * set image frame
		originWidth := imageBuffer.Width()
		originHeight := imageBuffer.Height()
		newWidth, newHeight := GetNewSize(
			originWidth,
			originHeight,
			imgSize,
			imgWidth,
			imgHeight,
		)
		if newWidth != originWidth || newHeight != originHeight {
			err = imageBuffer.Resize(
				float64(newWidth)/float64(originWidth),
				vips.KernelLanczos3,
			)

			if err != nil {
				result.err = err
				result.errMessage = "can not resize image"
				resultCh <- result
				return
			}
		}

		// * set image blur
		err = imageBuffer.GaussianBlur(GetBlur(imgBlur))
		if err != nil {
			result.err = err
			result.errMessage = "can not set image blur"
			resultCh <- result
			return
		}

		// * set image brightness
		// TODO: need to rewrite
		brightSigma, err := strconv.ParseFloat(imgBright, 64)
		if err != nil {
			result.err = err
			result.errMessage = "can not set image brightness"
			resultCh <- result
			return
		}

		err = imageBuffer.Linear([]float64{brightSigma}, []float64{0})
		if err != nil {
			result.err = err
			result.errMessage = "can not set image brightness"
			resultCh <- result
			return
		}

		// * set image quality
		quality := GetQuality(imgQuality, imgType)

		// * set image type
		switch imgType {
		case "jpg":
			exportParams := vips.NewJpegExportParams()
			exportParams.Quality = quality
			buffer, _, err = imageBuffer.ExportJpeg(exportParams)
			c.Header("Content-Type", "image/jpeg")
		case "png":
			// * png not to set quality
			exportParams := vips.NewPngExportParams()
			buffer, _, err = imageBuffer.ExportPng(exportParams)
			c.Header("Content-Type", "image/png")
		case "avif":
			exportParams := vips.NewAvifExportParams()
			exportParams.Quality = quality
			buffer, _, err = imageBuffer.ExportAvif(exportParams)
			c.Header("Content-Type", "image/avif")
		default:
			exportParams := vips.NewWebpExportParams()
			exportParams.Quality = quality
			buffer, _, err = imageBuffer.ExportWebp(exportParams)
			c.Header("Content-Type", "image/webp")
		}
		if err != nil {
			result.err = err
			result.errMessage = "can not export image"
			resultCh <- result
			return
		}

		// * save caching image
		if err := os.WriteFile(cachePath, buffer, 0644); err != nil {
			result.err = err
			result.errMessage = "Can not save caching image"
			resultCh <- result
			return
		}

		result.buffer = buffer
		resultCh <- result
	}()

	select {
	case result := <-resultCh:
		if result.err != nil {
			utils.HandleGetError(c, http.StatusBadRequest, result.errMessage, imgDark, result.err)
			return
		}

		c.Data(http.StatusOK, c.GetHeader("Content-Type"), result.buffer)
		log.Printf("└── [INFO] create caching success: " + cachePath)

	case <-ctx.Done():
		log.Printf("└── [ERROR] timed out")
		c.String(http.StatusRequestTimeout, "timed out")
	}
}

func CheckImageType(imgType string) bool {
	typeMap := map[string]bool{
		"jpeg": true,
		"jpg":  true,
		"png":  true,
		"avif": true,
		"webp": true,
	}

	return typeMap[imgType]
}

func GetFileCachePath(path, imgSize, imgWidth, imgHeight, imgType, imgQuality, imgBlur, imgBright string) string {
	filePath := configs.GetUploadPath() + "/" + strings.TrimPrefix(path, "/")
	filePath = regexp.MustCompile(`\.\w+$`).ReplaceAllString(filePath, "")
	filePath = strings.Replace(filePath, "/storage/image/upload/", "/storage/image/cache/", 1)

	switch {
	case imgSize != "":
		return fmt.Sprintf("%s_%s_%s_%s_%s.%s", filePath, imgSize, imgQuality, imgBlur, imgBright, imgType)
	case imgWidth != "" && imgHeight != "":
		return fmt.Sprintf("%s_%s_%s_%s_%s_%s.%s", filePath, imgWidth, imgHeight, imgQuality, imgBlur, imgBright, imgType)
	case imgWidth != "":
		return fmt.Sprintf("%s_%s_auto_%s_%s_%s.%s", filePath, imgWidth, imgQuality, imgBlur, imgBright, imgType)
	case imgHeight != "":
		return fmt.Sprintf("%s_auto_%s_%s_%s_%s.%s", filePath, imgHeight, imgQuality, imgBlur, imgBright, imgType)
	default:
		return fmt.Sprintf("%s_auto_auto_%s_%s_%s.%s", filePath, imgQuality, imgBlur, imgBright, imgType)
	}
}

func GetNewSize(originWidth, originHeight int, imgSize, imgWidth, imgHeight string) (int, int) {
	newWidth := originWidth
	newHeight := originHeight

	if imgSize != "" {
		size, err := strconv.Atoi(imgSize)

		if err == nil {
			if originWidth > originHeight {
				newHeight = int(math.Min(float64(size), float64(originHeight)))
				newWidth = int(float64(newHeight) / float64(originHeight) * float64(originWidth))
			} else {
				newWidth = int(math.Min(float64(size), float64(originWidth)))
				newHeight = int(float64(newWidth) / float64(originWidth) * float64(originHeight))
			}
		}
	} else if imgWidth != "" && imgHeight != "" {
		width, wErr := strconv.Atoi(imgWidth)
		height, hErr := strconv.Atoi(imgHeight)

		if wErr == nil && hErr == nil {
			newWidth = int(math.Min(float64(width), float64(originWidth)))
			newHeight = int(math.Min(float64(height), float64(originHeight)))
		}
	} else if imgWidth != "" {
		width, err := strconv.Atoi(imgWidth)

		if err == nil {
			newWidth = int(math.Min(float64(width), float64(originWidth)))
			newHeight = int(float64(newWidth) / float64(originWidth) * float64(originHeight))
		}
	} else if imgHeight != "" {
		height, err := strconv.Atoi(imgHeight)

		if err == nil {
			newHeight = int(math.Min(float64(height), float64(originHeight)))
			newWidth = int(float64(newHeight) / float64(originHeight) * float64(originWidth))
		}
	} else if int(math.Min(float64(originWidth), float64(originHeight))) > 1024 {
		if originWidth > originHeight {
			newWidth = 1024
			newHeight = int(float64(newWidth) / float64(originWidth) * float64(originHeight))
		} else {
			newHeight = 1024
			newWidth = int(float64(newHeight) / float64(originHeight) * float64(originWidth))
		}
	}

	return newWidth, newHeight
}

// * set limit 0-100
func GetBlur(oldValue string) float64 {
	var defaultValue float64 = 0
	var minQuality, maxQuality = 0, 100

	if oldValue == "" {
		return defaultValue
	}

	newValue, err := strconv.ParseFloat(oldValue, 64)

	if err != nil {
		return defaultValue
	}

	return math.Min(math.Max(float64(newValue), float64(minQuality)), float64(maxQuality))
}

// * set limit 0-100
func GetQuality(oldValue, imgType string) int {
	var defaultValue int = 75
	var minQuality, maxQuality = 0, 100

	if imgType == "avif" {
		defaultValue = 50
	}

	if oldValue == "" {
		return defaultValue
	}

	newValue, err := strconv.Atoi(oldValue)

	if err != nil {
		return defaultValue
	}

	return int(math.Min(math.Max(float64(newValue), float64(minQuality)), float64(maxQuality)))
}

func GetMimeType(filePath string) string {
	switch {
	case strings.HasSuffix(filePath, ".jpg"), strings.HasSuffix(filePath, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(filePath, ".png"):
		return "image/png"
	case strings.HasSuffix(filePath, ".webp"):
		return "image/webp"
	case strings.HasSuffix(filePath, ".svg"):
		return "image/svg+xml"
	case strings.HasSuffix(filePath, ".pdf"):
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}
